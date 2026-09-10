import React from 'react';
import { cleanAISymbols } from '../../utils/cleanText';

interface CleanTextRendererProps {
  text: string;
  className?: string;
}

export const CleanTextRenderer: React.FC<CleanTextRendererProps> = ({ text, className = '' }) => {
  const cleaned = cleanAISymbols(text);

  // Split by double newline or single newline to parse logical blocks
  const blocks = cleaned.split(/\n\s*\n/);

  return (
    <div className={`space-y-3 leading-relaxed text-sm ${className}`}>
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

        if (lines.length === 0) return null;

        // Check if block is a bullet list
        const isBulletList = lines.every((l) => l.startsWith('•'));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-2 pl-2">
              {lines.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2">
                  <span className="text-sky-400 mt-1 select-none">•</span>
                  <span>{item.replace(/^•\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Check if block is a numbered list
        const isNumberedList = lines.every((l) => /^\d+[\.\)]\s/.test(l));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1.5 my-2 pl-1">
              {lines.map((item, iIdx) => {
                const match = item.match(/^(\d+)[\.\)]\s*(.*)/);
                const num = match ? match[1] : `${iIdx + 1}`;
                const content = match ? match[2] : item;
                return (
                  <li key={iIdx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {num}
                    </span>
                    <span className="flex-1">{content}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Standard paragraph or heading + paragraph
        return (
          <div key={bIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              // Highlight bold section headers if line is short and ends with colon or looks like a title
              const isHeader =
                (line.endsWith(':') && line.length < 80) ||
                (lIdx === 0 && lines.length > 1 && line.length < 50 && !line.includes('.'));

              if (isHeader) {
                return (
                  <h4
                    key={lIdx}
                    className="font-bold text-white text-sm tracking-wide pt-1 text-sky-200"
                  >
                    {line}
                  </h4>
                );
              }

              if (line.startsWith('•')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2 text-slate-300">
                    <span className="text-sky-400 mt-1 select-none">•</span>
                    <span>{line.replace(/^•\s*/, '')}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="text-slate-200">
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
