import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, RotateCcw } from 'lucide-react';

export interface FilterState {
  makes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  maxMileage: number | null;
  minYear: number | null;
  maxYear: number | null;
  dealScores: string[];
  locations: string[];
  sources: string[];
  sortBy: 'newest' | 'price_low' | 'price_high' | 'mileage_low' | 'best_deal';
}

const defaultFilters: FilterState = {
  makes: [], minPrice: null, maxPrice: null, maxMileage: null,
  minYear: null, maxYear: null, dealScores: [], locations: [], sources: [],
  sortBy: 'newest',
};

const popularMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Nissan', 'Hyundai', 'Kia', 'Jeep', 'Subaru', 'Lexus'];
const mileagePresets = [25000, 50000, 75000, 100000, 150000];
const pricePresets = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function FilterPanel({ filters, onChange, onClose, isOpen = true }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('makes');

  const toggleMake = (make: string) => {
    const makes = filters.makes.includes(make) ? filters.makes.filter(m => m !== make) : [...filters.makes, make];
    onChange({ ...filters, makes });
  };

  const toggleDealScore = (score: string) => {
    const dealScores = filters.dealScores.includes(score) ? filters.dealScores.filter(s => s !== score) : [...filters.dealScores, score];
    onChange({ ...filters, dealScores });
  };

  const activeFilterCount = [
    filters.makes.length > 0, filters.minPrice !== null, filters.maxPrice !== null,
    filters.maxMileage !== null, filters.minYear !== null, filters.dealScores.length > 0,
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-green-400" />
          <span className="font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button onClick={() => onChange(defaultFilters)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="p-4 border-b border-gray-800">
        <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
        <select value={filters.sortBy} onChange={e => onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
          <option value="newest">Newest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="mileage_low">Mileage: Low to High</option>
          <option value="best_deal">Best Deals First</option>
        </select>
      </div>

      {/* Makes */}
      <FilterSection title="Makes" expanded={expandedSection === 'makes'} onToggle={() => setExpandedSection(expandedSection === 'makes' ? null : 'makes')}>
        <div className="flex flex-wrap gap-2">
          {popularMakes.map(make => (
            <button key={make} onClick={() => toggleMake(make)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.makes.includes(make) ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {make}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price Range" expanded={expandedSection === 'price'} onToggle={() => setExpandedSection(expandedSection === 'price' ? null : 'price')}>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Min</label>
            <select value={filters.minPrice ?? ''} onChange={e => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none">
              <option value="">Any</option>
              {pricePresets.map(p => <option key={p} value={p}>${(p / 1000)}k</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">Max</label>
            <select value={filters.maxPrice ?? ''} onChange={e => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none">
              <option value="">Any</option>
              {pricePresets.map(p => <option key={p} value={p}>${(p / 1000)}k</option>)}
            </select>
          </div>
        </div>
      </FilterSection>

      {/* Mileage */}
      <FilterSection title="Max Mileage" expanded={expandedSection === 'mileage'} onToggle={() => setExpandedSection(expandedSection === 'mileage' ? null : 'mileage')}>
        <div className="flex flex-wrap gap-2">
          {mileagePresets.map(m => (
            <button key={m} onClick={() => onChange({ ...filters, maxMileage: filters.maxMileage === m ? null : m })}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.maxMileage === m ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {`<${(m / 1000)}k mi`}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Deal Score */}
      <FilterSection title="Deal Score" expanded={expandedSection === 'deals'} onToggle={() => setExpandedSection(expandedSection === 'deals' ? null : 'deals')}>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'great', label: 'Great', color: 'green' },
            { value: 'good', label: 'Good', color: 'blue' },
            { value: 'fair', label: 'Fair', color: 'yellow' },
            { value: 'overpriced', label: 'Overpriced', color: 'red' },
          ].map(({ value, label, color }) => (
            <button key={value} onClick={() => toggleDealScore(value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.dealScores.includes(value)
                  ? `border-${color}-500 bg-${color}-500/20 text-${color}-400`
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Year */}
      <FilterSection title="Year Range" expanded={expandedSection === 'year'} onToggle={() => setExpandedSection(expandedSection === 'year' ? null : 'year')}>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">From</label>
            <input type="number" placeholder="2010" value={filters.minYear ?? ''}
              onChange={e => onChange({ ...filters, minYear: e.target.value ? Number(e.target.value) : null })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">To</label>
            <input type="number" placeholder="2024" value={filters.maxYear ?? ''}
              onChange={e => onChange({ ...filters, maxYear: e.target.value ? Number(e.target.value) : null })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none" />
          </div>
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-800 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-800/50 transition">
        {title}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
