export interface VoiceSynthesisOptions {
  text: string;
  gender: 'male' | 'female';
}

export interface VoiceProvider {
  synthesizeSpeech(options: VoiceSynthesisOptions): Promise<{ audioBase64?: string; audioBuffer?: Buffer; error?: string; isAvailable: boolean }>;
}

// Configurable ElevenLabs Voice IDs
// 'Adam' (male: pNInz6obpgDQGcFmaJgB) & 'Rachel' (female: 21m00Tcm4TlvDq8ikWAM) or default high quality voices
const MALE_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const FEMALE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

class ElevenLabsVoiceProvider implements VoiceProvider {
  async synthesizeSpeech(options: VoiceSynthesisOptions): Promise<{ audioBase64?: string; audioBuffer?: Buffer; error?: string; isAvailable: boolean }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
      return {
        isAvailable: false,
        error: 'ElevenLabs API key not configured. Client-side browser synthesis available as fallback.',
      };
    }

    const voiceId = options.gender === 'male' ? MALE_VOICE_ID : FEMALE_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: options.text.slice(0, 1000), // safe ceiling for latency & quota
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[VoiceService] ElevenLabs API returned HTTP ${response.status}:`, errorText);
        return {
          isAvailable: false,
          error: `ElevenLabs returned HTTP ${response.status}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioBase64 = buffer.toString('base64');
      return {
        isAvailable: true,
        audioBase64,
        audioBuffer: buffer,
      };
    } catch (err: any) {
      console.error('[VoiceService] Synthesis failed:', err);
      return {
        isAvailable: false,
        error: err.message || 'Voice synthesis error',
      };
    }
  }
}

let activeVoiceProvider: VoiceProvider = new ElevenLabsVoiceProvider();

export function setVoiceProvider(provider: VoiceProvider) {
  activeVoiceProvider = provider;
}

export async function synthesizeTutorSpeech(text: string, gender: 'male' | 'female' = 'female') {
  return activeVoiceProvider.synthesizeSpeech({ text, gender });
}
