import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { X, Plus, Heart, Zap } from 'lucide-react';

interface UserPreferencesData {
  preferred_makes: string[];
  preferred_locations: string[];
  preferred_models: string[];
  preferred_price_min: number;
  preferred_price_max: number;
  preferred_mileage_max: number;
  year_min: number;
  year_max: number;
  condition: 'New' | 'Used' | 'Any';
  body_types: string[];
  notify_enabled: boolean;
  total_likes: number;
  total_skips: number;
}

const BODY_TYPE_OPTIONS = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Van/Minivan', 'Wagon', 'Hatchback'];
const CONDITION_OPTIONS = ['New', 'Used', 'Any'];

export function PreferencesPage() {
  const { user, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferencesData>({
    preferred_makes: [],
    preferred_locations: [],
    preferred_models: [],
    preferred_price_min: 5000,
    preferred_price_max: 50000,
    preferred_mileage_max: 150000,
    year_min: 2010,
    year_max: 2026,
    condition: 'Any',
    body_types: [],
    notify_enabled: false,
    total_likes: 0,
    total_skips: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMake, setNewMake] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newModel, setNewModel] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      fetchPreferences();
    }
  }, [user, authLoading]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      if (data) {
        setPreferences(prev => ({
          ...prev,
          preferred_makes: data.preferred_makes || [],
          preferred_locations: data.preferred_locations || [],
          preferred_models: data.preferred_models || [],
          preferred_price_min: data.preferred_price_min || 5000,
          preferred_price_max: data.preferred_price_max || 50000,
          preferred_mileage_max: data.preferred_mileage_max || 150000,
          year_min: data.year_min || 2010,
          year_max: data.year_max || 2026,
          condition: data.condition || 'Any',
          body_types: data.body_types || [],
          notify_enabled: data.notify_enabled || false,
          total_likes: data.total_likes || 0,
          total_skips: data.total_skips || 0,
        }));
      }
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
      setError(err?.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const validatePreferences = (): string | null => {
    if (preferences.preferred_price_min < 0) return 'Min price cannot be negative';
    if (preferences.preferred_price_max < 0) return 'Max price cannot be negative';
    if (preferences.preferred_price_min > preferences.preferred_price_max) return 'Min price cannot be greater than max price';
    if (preferences.preferred_mileage_max < 0) return 'Max mileage cannot be negative';
    if (preferences.year_min < 1900 || preferences.year_min > 2030) return 'Min year must be between 1900 and 2030';
    if (preferences.year_max < 1900 || preferences.year_max > 2030) return 'Max year must be between 1900 and 2030';
    if (preferences.year_min > preferences.year_max) return 'Min year cannot be greater than max year';
    return null;
  };

  const savePreferences = async () => {
    if (!user) return;

    const validationError = validatePreferences();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            preferred_makes: preferences.preferred_makes,
            preferred_locations: preferences.preferred_locations,
            preferred_models: preferences.preferred_models,
            preferred_price_min: preferences.preferred_price_min,
            preferred_price_max: preferences.preferred_price_max,
            preferred_mileage_max: preferences.preferred_mileage_max,
            year_min: preferences.year_min,
            year_max: preferences.year_max,
            condition: preferences.condition,
            body_types: preferences.body_types,
            notify_enabled: preferences.notify_enabled,
            total_likes: preferences.total_likes,
            total_skips: preferences.total_skips,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        // If the new columns don't exist yet, save what we can
        const { error: fallbackError } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              preferred_makes: preferences.preferred_makes,
              preferred_locations: preferences.preferred_locations,
              preferred_price_min: preferences.preferred_price_min,
              preferred_price_max: preferences.preferred_price_max,
              preferred_mileage_max: preferences.preferred_mileage_max,
              total_likes: preferences.total_likes,
              total_skips: preferences.total_skips,
            },
            { onConflict: 'user_id' }
          );
        if (fallbackError) throw fallbackError;
      }
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const addMake = () => {
    if (newMake.trim() && !preferences.preferred_makes.includes(newMake.trim())) {
      setPreferences(prev => ({
        ...prev,
        preferred_makes: [...prev.preferred_makes, newMake.trim()],
      }));
      setNewMake('');
    }
  };

  const removeMake = (make: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_makes: prev.preferred_makes.filter(m => m !== make),
    }));
  };

  const addLocation = () => {
    if (newLocation.trim() && !preferences.preferred_locations.includes(newLocation.trim())) {
      setPreferences(prev => ({
        ...prev,
        preferred_locations: [...prev.preferred_locations, newLocation.trim()],
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (location: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_locations: prev.preferred_locations.filter(l => l !== location),
    }));
  };

  const addModel = () => {
    if (newModel.trim() && !preferences.preferred_models.includes(newModel.trim())) {
      setPreferences(prev => ({
        ...prev,
        preferred_models: [...prev.preferred_models, newModel.trim()],
      }));
      setNewModel('');
    }
  };

  const removeModel = (model: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_models: prev.preferred_models.filter(m => m !== model),
    }));
  };

  const toggleBodyType = (bodyType: string) => {
    setPreferences(prev => ({
      ...prev,
      body_types: prev.body_types.includes(bodyType)
        ? prev.body_types.filter(bt => bt !== bodyType)
        : [...prev.body_types, bodyType],
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-gray-400">Loading preferences...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-300 mb-2">Sign in required</h2>
          <p className="text-gray-500">Please sign in to view your preferences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Your Preferences
          </h1>
          <p className="text-lg text-gray-400">Customize your deal feed and get notified about matches</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="border-b border-slate-800/50 bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-gray-500 text-sm mb-1">Total Likes</p>
              <p className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                {preferences.total_likes}
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-gray-500 text-sm mb-1">Total Skips</p>
              <p className="text-2xl font-bold text-orange-400">{preferences.total_skips}</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-gray-500 text-sm mb-1">Preferred Makes</p>
              <p className="text-2xl font-bold text-blue-400">{preferences.preferred_makes.length}</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-gray-500 text-sm mb-1">Preferred Locations</p>
              <p className="text-2xl font-bold text-purple-400">{preferences.preferred_locations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Preferred Makes */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Preferred Car Brands</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newMake}
                onChange={e => setNewMake(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addMake()}
                placeholder="e.g., Toyota"
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={addMake}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_makes.map(make => (
                <span
                  key={make}
                  className="bg-blue-500/20 border border-blue-500/50 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {make}
                  <button
                    onClick={() => removeMake(make)}
                    className="ml-1 hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Locations */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Preferred Locations</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addLocation()}
                placeholder="e.g., Los Angeles"
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={addLocation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_locations.map(location => (
                <span
                  key={location}
                  className="bg-purple-500/20 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {location}
                  <button
                    onClick={() => removeLocation(location)}
                    className="ml-1 hover:text-purple-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Models */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Preferred Car Models</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newModel}
                onChange={e => setNewModel(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addModel()}
                placeholder="e.g., Camry"
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={addModel}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_models.map(model => (
                <span
                  key={model}
                  className="bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {model}
                  <button
                    onClick={() => removeModel(model)}
                    className="ml-1 hover:text-cyan-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Price Range</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Price</label>
                <input
                  type="number"
                  value={preferences.preferred_price_min}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      preferred_price_min: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Price</label>
                <input
                  type="number"
                  value={preferences.preferred_price_max}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      preferred_price_max: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Mileage */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Maximum Mileage</h2>
            <input
              type="number"
              value={preferences.preferred_mileage_max}
              onChange={e =>
                setPreferences(prev => ({
                  ...prev,
                  preferred_mileage_max: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Year Range */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Year Range</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Year</label>
                <input
                  type="number"
                  min="1990"
                  max="2026"
                  value={preferences.year_min}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      year_min: parseInt(e.target.value) || 2010,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Year</label>
                <input
                  type="number"
                  min="1990"
                  max="2026"
                  value={preferences.year_max}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      year_max: parseInt(e.target.value) || 2026,
                    }))
                  }
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Condition Preference</h2>
            <div className="flex gap-3">
              {CONDITION_OPTIONS.map(condition => (
                <label key={condition} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value={condition}
                    checked={preferences.condition === condition}
                    onChange={e =>
                      setPreferences(prev => ({
                        ...prev,
                        condition: e.target.value as 'New' | 'Used' | 'Any',
                      }))
                    }
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-gray-300">{condition}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Body Types */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Body Type Preference</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BODY_TYPE_OPTIONS.map(bodyType => (
                <label key={bodyType} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.body_types.includes(bodyType)}
                    onChange={() => toggleBodyType(bodyType)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="text-gray-300">{bodyType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/30 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Notifications</h2>
                  <p className="text-sm text-gray-400">Get notified about matching deals</p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notify_enabled}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      notify_enabled: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

