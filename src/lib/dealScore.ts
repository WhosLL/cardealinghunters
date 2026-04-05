import { DealScore } from '../types/index';

export function calculateDealScore(price: number, marketValue: number | null): DealScore {
  if (!marketValue) {
    return 'fair';
  }

  if (price < marketValue * 0.85) {
    return 'great';
  }
  if (price < marketValue * 0.95) {
    return 'good';
  }
  if (price <= marketValue * 1.05) {
    return 'fair';
  }
  return 'overpriced';
}
