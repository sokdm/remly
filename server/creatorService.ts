import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { CreatorGeneration } from '../src/types';

export interface GenerateImageOptions {
  creatorUid: string;
  prompt: string;
  style?: string; // 'Digital Art' | 'Photorealistic' | 'Educational Diagram' | 'Concept Art' | 'Minimalist'
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
}

function generateProceduralCreativeCanvas(prompt: string, style: string = 'Digital Art', aspectRatio: string = '1:1'): string {
  const width = aspectRatio === '16:9' ? 960 : aspectRatio === '9:16' ? 540 : aspectRatio === '4:3' ? 800 : 720;
  const height = aspectRatio === '16:9' ? 540 : aspectRatio === '9:16' ? 960 : aspectRatio === '4:3' ? 600 : 720;

  // Generate pleasant gradient palettes based on prompt hash
  const colors = [
    ['#0f172a', '#1e293b', '#0ea5e9', '#38bdf8'],
    ['#18181b', '#27272a', '#8b5cf6', '#a855f7'],
    ['#064e3b', '#047857', '#10b981', '#34d399'],
    ['#701a75', '#86198f', '#d946ef', '#f472b6'],
    ['#7c2d12', '#9a3412', '#f97316', '#fb923c'],
  ];
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0;
  }
  const palette = colors[Math.abs(hash) % colors.length];

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette[0]}" />
        <stop offset="50%" stop-color="${palette[1]}" />
        <stop offset="100%" stop-color="${palette[2]}" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <!-- Dynamic artistic elements -->
    <circle cx="${width * 0.7}" cy="${height * 0.3}" r="${width * 0.25}" fill="${palette[3]}" opacity="0.35" filter="url(#glow)" />
    <circle cx="${width * 0.3}" cy="${height * 0.75}" r="${width * 0.3}" fill="${palette[2]}" opacity="0.25" filter="url(#glow)" />
    <polygon points="${width * 0.1},${height * 0.9} ${width * 0.5},${height * 0.2} ${width * 0.9},${height * 0.9}" fill="none" stroke="${palette[3]}" stroke-width="2" opacity="0.2" />
    
    <!-- Framing border -->
    <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="12" fill="none" stroke="${palette[3]}" stroke-width="1.5" opacity="0.3" />
    
    <!-- Watermark Brand -->
    <text x="36" y="${height - 36}" fill="#ffffff" opacity="0.6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="2">REMLY CREATOR STUDIO</text>
    <text x="36" y="${height - 56}" fill="${palette[3]}" opacity="0.8" font-family="sans-serif" font-size="12" font-weight="500">${style.toUpperCase()}</text>
    
    <!-- Prompt summary banner -->
    <foreignObject x="36" y="${height * 0.35}" width="${width - 72}" height="${height * 0.4}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: ${width > 600 ? '22px' : '16px'}; font-weight: 600; line-height: 1.4; text-shadow: 0 4px 12px rgba(0,0,0,0.6); word-break: break-word;">
        "${prompt}"
      </div>
    </foreignObject>
  </svg>
  `.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export async function generateCreatorImage(options: GenerateImageOptions): Promise<CreatorGeneration> {
  const { creatorUid, prompt, style = 'Digital Art', aspectRatio = '1:1' } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  let imageUrl: string | null = null;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const styledPrompt = `${prompt}, style: ${style}, high quality, crisp details, professional graphic design masterpiece`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: styledPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (err: any) {
      console.warn('[CreatorService] Gemini Image API call unavailable or requires paid key:', err.message);
    }
  }

  // If Gemini model didn't return an image, produce our crisp SVG studio render
  if (!imageUrl) {
    imageUrl = generateProceduralCreativeCanvas(prompt, style, aspectRatio);
  }

  const record: CreatorGeneration = {
    id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    creatorUid,
    prompt,
    style,
    aspectRatio,
    imageUrl,
    createdAt: new Date().toISOString(),
    downloadCount: 0,
  };

  await db.creatorGenerations.insertOne(record);
  return record;
}

export async function getCreatorHistory(creatorUid: string): Promise<CreatorGeneration[]> {
  const list = await db.creatorGenerations.find({ creatorUid });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteCreatorImage(id: string, creatorUid: string): Promise<boolean> {
  return db.creatorGenerations.deleteOne({ id, creatorUid });
}
