import { useState, useEffect } from 'react';
import { Settings, Heart, X, MapPin, DollarSign, Gauge, Car, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';

const CAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes',
  'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Volkswagen', 'Mazda',
  'Audi', 'Lexus', 'Jeep', 'Ram', 'GMC', 'Buick', 'Cadillac', 'Dodge',
];

export function PreferencesPage() {
  const { profile } = useAuth();
  const { preferences, loading, error, updatePreferences, refetch } = usePreferences();

  const [editMakes, setEditMakes] = useState<string[]>([]);
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState('');
  const [editPriceMin, setEditPriceMin] = useState('');
  const [editPriceMax, setEditPriceMax] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [makesOpen, setMakesOpen] = useState(false);

  useEffect(() => {
    if (preferences) {
      setEditMakes(preferences.preferred_makes || []);
      setEditLocations(preferences.preferred_locations || []);
      setEditPriceMin(preferences.preferred_price_min?.toString() || '');
      setEditPriceMax(preferences.preferred_price_max?.toString() || '');
      setEditMileage(preferences.preferred_mileage_max?.toString() || '');
    }
  }, [preferences]);

  const handleMakeToggle = (make: string) => {
    setEditMakes(prev =>
      prev.includes(make) ? prev.filter(m => m !== make) : [...prev, make]
    );
  };

  const handleAddLocation = () => {
    if (newLocation.trim() && !editLocations.includes(newLocation.trim())) {
      setEditLocations(prev => [...prev, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    setEditLocations(prev => prev.filter(l => l !== loc));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await updatePreferences({
        preferred_makes: editMakes,
        preferred_locations: editLocations,
        preferred_price_min: editPriceMin ? parseInt(editPriceMin) : null,
        preferred_price_max: editPriceMax ? parseInt(editPriceMax) : null,
        preferred_mileage_max: editMileage ? parseInt(editMileage) : null,
      });
      setSaveMsg('Preferences saved!');
      refetch();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">AI Preferences</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">{error}</div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-white">Total Likes</h3>
          </div>
          <p className="text-3xl font-bold text-green-400">{preferences?.total_likes || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <X className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white">Total Skips</h3>
          </div>
          <p className="text-3xl font-bold text-red-400">{preferences?.total_skips || 0}</p>
        </div>
      </div>

      {/* Editable Preferences */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Your Preferences</h2>
        <p className="text-gray-400 mb-6">Edit your preferences below. These are also learned from your likes and skips.</p>

        {/* Preferred Makes */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-white">Preferred Makes</h3>
          </div>
          <button
            onClick={() => setMakesOpen(!makesOpen)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-left mb-1"
          >
            {editMakes.length === 0 ? 'Select makes...' : editMakes.join(', ')}
          </button>
          {makesOpen && (
            <div className="max-h-48 overflow-y-auto bg-gray-700 rounded border border-gray-600 p-2 grid grid-cols-2 gap-1">
              {CAR_MAKES.map((make) => (
                <label key={make} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-gray-600 rounded">
                  <input
                    type="checkbox"
                    checked={editMakes.includes(make)}
                    onChange={() => handleMakeToggle(make)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">{make}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Preferred Locations */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium text-white">Preferred Locations</h3>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder="Add a location..."
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAddLocation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editLocations.map((loc) => (
              <span key={loc} className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {loc}
                <button onClick={() => handleRemoveLocation(loc)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {editLocations.length === 0 && (
              <span className="text-gray-500 text-sm">No locations added yet</span>
            )}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-white">Price Range</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              value={editPriceMin}
              onChange={(e) => setEditPriceMin(e.target.value)}
              placeholder="Min price"
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              value={editPriceMax}
              onChange={(e) => setEditPriceMax(e.target.value)}
              placeholder="Max price"
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Max Mileage */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-yellow-500" />
            <h3 className="font-medium text-white">Max Mileage</h3>
          </div>
          <input
            type="number"
            value={editMileage}
            onChange={(e) => setEditMileage(e.target.value)}
            placeholder="Max mileage"
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saveMsg && (
          <p className={`text-center mt-2 text-sm ${saveMsg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
            {saveMsg}
          </p>
        )}
      </div>
    </div>
  );
}
