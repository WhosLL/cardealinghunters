import { DealScore } from '../types/index';

export function calculateDealScore(price: number, marketValue: number | null): DealScore {
  const score = calculateNumericDealScore(price, marketValue);
  return scoreToLabel(score);
}

export function calculateNumericDealScore(price: number, marketValue: number | null): number {
  if (!marketValue || marketValue <= 0) return 50;
  const ratio = price / marketValue;
  const score = Math.round(100 - (ratio - 0.5) * 100);
  return Math.max(1, Math.min(100, score));
}

export function scoreToLabel(score: number): DealScore {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'overpriced';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // emerald
  if (score >= 60) return '#eab308'; // yellow
  if (score >= 40) return '#6b7280'; // gray
  return '#ef4444'; // red
}

export function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-gray-500 to-gray-600';
  return 'from-red-500 to-red-600';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Incredible Deal';
  if (score >= 80) return 'Great Deal';
  if (score >= 70) return 'Good Deal';
  if (score >= 60) return 'Above Average';
  if (score >= 50) return 'Fair Price';
  if (score >= 40) return 'Below Average';
  if (score >= 25) return 'Overpriced';
  return 'Way Overpriced';
}
