/**
 * Central Remly Platform Configuration
 * The AI tutor name is configurable here in one central configuration file.
 * Do not hardcode or call the AI "Gemini" in the UI.
 */
export const REMLY_CONFIG = {
  appName: 'Remly',
  tagline: 'The Two-Sided Platform for Adaptive Learning & Creator Intelligence',
  // Configurable AI Tutor Name
  aiTutorName: 'Remly AI Tutor',
  aiTutorShortName: 'Remly AI',
  aiTutorPersona:
    'You are Remly AI Tutor, a friendly, intellectually sharp, and patient pedagogical mentor. You help students understand concepts deeply with first-principles reasoning, step-by-step clarity, and motivating encouragement. Never call yourself Gemini or Google. You are Remly.',
  version: '2.4.0',
  xpPerQuestion: 15,
  xpPerLesson: 50,
  xpPerExamCompletion: 100,
  xpPerExamPass: 150,
  xpPerStreakDay: 30,
  levelMilestones: [0, 100, 400, 900, 1600, 2500, 3600, 4900, 6400, 8100, 10000],
  countries: [] as CountryOption[],
  calculateLevel: (xp: number): number => {
    // Formula: Level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  },
  calculateXpForLevel: (level: number): number => {
    // XP threshold required to reach 'level'
    return Math.pow(level - 1, 2) * 100;
  },
  calculateXpForNextLevel: (level: number): number => {
    return Math.pow(level, 2) * 100;
  },
};

export interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹' },
];

REMLY_CONFIG.countries = COUNTRIES;
