import type { Listing } from '../types';

export function exportListingsCSV(listings: Listing[], filename = 'cardealinghunters-export') {
  const headers = [
    'Title', 'Year', 'Make', 'Model', 'Price', 'Market Value', 'Deal Score',
    'Mileage', 'Location', 'Source', 'Posted Date', 'Source URL', 'Description'
  ];

  const rows = listings.map(l => [
    `"${(l.title || '').replace(/"/g, '""')}"`,
    l.year,
    l.make,
    l.model,
    l.price,
    l.market_value || '',
    l.deal_score,
    l.mileage,
    `"${(l.location || '').replace(/"/g, '""')}"`,
    l.source,
    new Date(l.posted_at).toLocaleDateString(),
    l.source_url,
    `"${(l.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSavedDealsCSV(listings: Listing[]) {
  exportListingsCSV(listings, 'saved-deals');
}
