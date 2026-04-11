import type { DealScore } from '../types';

const scoreConfig: Record<DealScore, { label: string; bg: string; text: string; border: string }> = {
  great: { label: 'Great Deal', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  good: { label: 'Good Deal', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  fair: { label: 'Fair Price', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  overpriced: { label: 'Overpriced', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

interface Props {
  score: DealScore;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function DealScoreBadge({ score, size = 'md', showDot = true }: Props) {
  const config = scoreConfig[score] || scoreConfig.fair;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')}`} />}
      {config.label}
    </span>
  );
}
