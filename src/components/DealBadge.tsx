import { DealScore } from '../types/index';

interface DealBadgeProps {
  score: DealScore;
}

export function DealBadge({ score }: DealBadgeProps) {
  const badgeConfig: Record<DealScore, { bg: string; text: string; label: string }> = {
    great: {
      bg: 'bg-green-500',
      text: 'text-white',
      label: 'Great Deal',
    },
    good: {
      bg: 'bg-yellow-500',
      text: 'text-gray-900',
      label: 'Good Deal',
    },
    fair: {
      bg: 'bg-gray-500',
      text: 'text-white',
      label: 'Fair Price',
    },
    overpriced: {
      bg: 'bg-red-500',
      text: 'text-white',
      label: 'Overpriced',
    },
  };

  const config = badgeConfig[score];

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
