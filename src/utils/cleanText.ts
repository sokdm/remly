/**
 * Clean AI Text Utilities
 * Completely removes unwanted markdown symbols (*, **, ###, ---, bullet symbols)
 * so that AI responses are presented in pristine, human-readable text.
 */

export function cleanAISymbols(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove schedule marker internal tag if present
  text = text.replace(/\[SCHEDULE_CLASS:\s*\{.*?\}\]/gs, '');

  // 2. Remove markdown horizontal rules (---, ***, ___)
  text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 3. Remove heading hashes at start of lines (e.g. ### Header -> Header)
  text = text.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');

  // 4. Remove bold & italic asterisks and underscores (**word** -> word, *word* -> word)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 5. Clean stray double asterisks
  text = text.replace(/\*\*/g, '');

  // 6. Clean markdown code blocks and inline backticks
  text = text.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 7. Clean bullet asterisks/dashes at line start to a clean elegant bullet
  text = text.replace(/^[ \t]*[\*\-][ \t]+/gm, '• ');

  // 8. Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Prepares text for Voice Text-to-Speech playback:
 * Strips remaining symbols, bullets, numbers or emojis so audio reads naturally.
 */
export function cleanForSpeech(rawText: string): string {
  let text = cleanAISymbols(rawText);
  // Remove bullet points
  text = text.replace(/•/g, '');
  // Clean multiple spaces
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}
