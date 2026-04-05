import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ListingsFilters } from '../hooks/useListings';

interface FiltersProps {
  onFiltersChange: (filters: ListingsFilters) => void;
  onReset: () => void;
}

const CAR_MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'BMW',
  'Mercedes',
  'Nissan',
  'Hyundai',
  'Kia',
  'Subaru',
  'Volkswagen',
  'Mazda',
  'Audi',
  'Lexus',
  'Jeep',
  'Ram',
  'GMC',
  'Buick',
  'Cadillac',
  'Dodge',
];

const DEAL_SCORES = [
  { value: 'great', label: 'Great Deal' },
  { value: 'good', label: 'Good Deal' },
  { value: 'fair', label: 'Fair Price' },
  { value: 'overpriced', label: 'Overpriced' },
];

export function Filters({ onFiltersChange, onReset }: FiltersProps) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [make, setMake] = useState('');
  const [maxMileage, setMaxMileage] = useState('');
  const [dealScores, setDealScores] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const filters: ListingsFilters = {};

    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);
    if (make) filters.make = make;
    if (maxMileage) filters.maxMileage = parseInt(maxMileage);
    if (dealScores.length > 0) filters.dealScores = dealScores;

    onFiltersChange(filters);
  }, [minPrice, maxPrice, make, maxMileage, dealScores]);

  const handleDealScoreChange = (score: string) => {
    setDealScores((prev) =>
      prev.includes(score) ? prev.filter((s) => s !== score) : [...prev, score]
    );
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setMake('');
    setMaxMileage('');
    setDealScores([]);
    onReset();
  };

  const hasActiveFilters =
    minPrice || maxPrice || make || maxMileage || dealScores.length > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-lg font-semibold text-white hover:text-blue-400 transition-colors"
      >
        <span>Filters {hasActiveFilters && '(Active)'}</span>
        <span className="text-2xl">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Min Price
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Price
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Make */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Make
            </label>
            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Makes</option>
              {CAR_MAKES.map((carMake) => (
                <option key={carMake} value={carMake}>
                  {carMake}
                </option>
              ))}
            </select>
          </div>

          {/* Max Mileage */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Mileage
            </label>
            <input
              type="number"
              value={maxMileage}
              onChange={(e) => setMaxMileage(e.target.value)}
              placeholder="No limit"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Deal Scores */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deal Score
            </label>
            <div className="space-y-2">
              {DEAL_SCORES.map((score) => (
                <label key={score.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dealScores.includes(score.value)}
                    onChange={() => handleDealScoreChange(score.value)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">{score.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <X size={18} />
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
