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

  const savePreferences = async () => {
    if (!user) return;
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
        <div className=" => l !== location),
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
                <spanöâÐ¢Æ6VöÆFW#Ò&RærâÂÆ÷2ævVÆW2 ¢6Æ74æÖSÒ&fÆWÓÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRÆ6VöÆFW"Öw&ÓSfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢Æ'WGFöà¢öä6Æ6³×¶FDÆö6FöçÐ¢6Æ74æÖSÒ'ÓBÓ"&rÖ&ÇVRÓc÷fW#¦&rÖ&ÇVRÓSFWB×vFR&÷VæFVBÖÆrföçBÖÖVFVÒG&ç6FöâÖ6öÆ÷'2fÆWFV×2Ö6VçFW"vÓ" ¢à¢ÅÇW26Æ74æÖSÒ'rÓBÓB"óâF@¢Âö'WGFöãà¢ÂöFcà¢ÆFb6Æ74æÖSÒ&fÆWfÆW×w&vÓ"#à¢·&VfW&Væ6W2ç&VfW'&VEöÆö6Föç2æÖÆö6FöâÓâ¢Ç7à¢¶W×¶Æö6FöçÐ¢6Æ74æÖSÒ&&r×W'ÆRÓSó#&÷&FW"&÷&FW"×W'ÆRÓSóSFWB×W'ÆRÓ3Ó2Ó&÷VæFVBÖgVÆÂFWB×6ÒfÆWFV×2Ö6VçFW"vÓ" ¢à¢¶Æö6FöçÐ¢Æ'WGFöà¢öä6Æ6³×²Óâ&VÖ÷fTÆö6FöâÆö6FöâÐ¢6Æ74æÖSÒ&ÖÂÓ÷fW#§FWB×W'ÆRÓ# ¢à¢Å6Æ74æÖSÒ'rÓ2Ó2"óà¢Âö'WGFöãà¢Â÷7ãà¢Ð¢ÂöFcà¢ÂöFcà ¢²ò¢&VfW'&VBÖöFVÇ2¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#å&VfW'&VB6"ÖöFVÇ3Âö#à¢ÆFb6Æ74æÖSÒ&fÆWvÓ"Ö"ÓB#à¢ÆçW@¢GSÒ'FWB ¢fÇVS×¶æWtÖöFVÇÐ¢öä6ævS×¶RÓâ6WDæWtÖöFVÂRçF&vWBçfÇVRÐ¢öä¶W&W73×¶RÓâRæ¶WÓÓÒtVçFW"rbbFDÖöFVÂÐ¢Æ6VöÆFW#Ò&RærâÂ6×' ¢6Æ74æÖSÒ&fÆWÓÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRÆ6VöÆFW"Öw&ÓSfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢Æ'WGFöà¢öä6Æ6³×¶FDÖöFVÇÐ¢6Æ74æÖSÒ'ÓBÓ"&rÖ&ÇVRÓc÷fW#¦&rÖ&ÇVRÓSFWB×vFR&÷VæFVBÖÆrföçBÖÖVFVÒG&ç6FöâÖ6öÆ÷'2fÆWFV×2Ö6VçFW"vÓ" ¢à¢ÅÇW26Æ74æÖSÒ'rÓBÓB"óâF@¢Âö'WGFöãà¢ÂöFcà¢ÆFb6Æ74æÖSÒ&fÆWfÆW×w&vÓ"#à¢·&VfW&Væ6W2ç&VfW'&VEöÖöFVÇ2æÖÖöFVÂÓâ¢Ç7à¢¶W×¶ÖöFVÇÐ¢6Æ74æÖSÒ&&rÖ7âÓSó#&÷&FW"&÷&FW"Ö7âÓSóSFWBÖ7âÓ3Ó2Ó&÷VæFVBÖgVÆÂFWB×6ÒfÆWFV×2Ö6VçFW"vÓ" ¢à¢¶ÖöFVÇÐ¢Æ'WGFöà¢öä6Æ6³×²Óâ&VÖ÷fTÖöFVÂÖöFVÂÐ¢6Æ74æÖSÒ&ÖÂÓ÷fW#§FWBÖ7âÓ# ¢à¢Å6Æ74æÖSÒ'rÓ2Ó2"óà¢Âö'WGFöãà¢Â÷7ãà¢Ð¢ÂöFcà¢ÂöFcà ¢²ò¢&6R&ævR¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#å&6R&ævSÂö#à¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó"vÓB#à¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×6ÒFWBÖw&ÓCÖ"Ó"#äÖâ&6SÂöÆ&VÃà¢ÆçW@¢GSÒ&çVÖ&W" ¢fÇVS×·&VfW&Væ6W2ç&VfW'&VE÷&6UöÖçÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢&VfW'&VE÷&6UöÖã¢'6TçBRçF&vWBçfÇVRÇÂÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÖgVÆÂÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢ÂöFcà¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×6ÒFWBÖw&ÓCÖ"Ó"#äÖ&6SÂöÆ&VÃà¢ÆçW@¢GSÒ&çVÖ&W" ¢fÇVS×·&VfW&Væ6W2ç&VfW'&VE÷&6UöÖÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢&VfW'&VE÷&6UöÖ¢'6TçBRçF&vWBçfÇVRÇÂÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÖgVÆÂÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢ÂöFcà¢ÂöFcà¢ÂöFcà ¢²ò¢ÖÆVvR¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#äÖ×VÒÖÆVvSÂö#à¢ÆçW@¢GSÒ&çVÖ&W" ¢fÇVS×·&VfW&Væ6W2ç&VfW'&VEöÖÆVvUöÖÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢&VfW'&VEöÖÆVvUöÖ¢'6TçBRçF&vWBçfÇVRÇÂÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÖgVÆÂÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢ÂöFcà ¢²ò¢V"&ævR¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#åV"&ævSÂö#à¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó"vÓB#à¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×6ÒFWBÖw&ÓCÖ"Ó"#äÖâV#ÂöÆ&VÃà¢ÆçW@¢GSÒ&çVÖ&W" ¢ÖãÒ# ¢ÖÒ###b ¢fÇVS×·&VfW&Væ6W2çV%öÖçÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢V%öÖã¢'6TçBRçF&vWBçfÇVRÇÂ#À¢Ò¢Ð¢6Æ74æÖSÒ'rÖgVÆÂÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢ÂöFcà¢ÆFcà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²FWB×6ÒFWBÖw&ÓCÖ"Ó"#äÖV#ÂöÆ&VÃà¢ÆçW@¢GSÒ&çVÖ&W" ¢ÖãÒ# ¢ÖÒ###b ¢fÇVS×·&VfW&Væ6W2çV%öÖÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢V%öÖ¢'6TçBRçF&vWBçfÇVRÇÂ##bÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÖgVÆÂÓBÓ"&r×6ÆFRÓóS&÷&FW"&÷&FW"×6ÆFRÓsóS&÷VæFVBÖÆrFWB×vFRfö7W3¦÷WFÆæRÖæöæRfö7W3¦&÷&FW"Ö&ÇVRÓSóS ¢óà¢ÂöFcà¢ÂöFcà¢ÂöFcà ¢²ò¢6öæFFöâ¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#ä6öæFFöâ&VfW&Væ6SÂö#à¢ÆFb6Æ74æÖSÒ&fÆWvÓ2#à¢´4ôäDDôåôõDôå2æÖ6öæFFöâÓâ¢ÆÆ&VÂ¶W×¶6öæFFöçÒ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ"7W'6÷"×öçFW"#à¢ÆçW@¢GSÒ'&Fò ¢æÖSÒ&6öæFFöâ ¢fÇVS×¶6öæFFöçÐ¢6V6¶VC×·&VfW&Væ6W2æ6öæFFöâÓÓÒ6öæFFöçÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢6öæFFöã¢RçF&vWBçfÇVR2tæWrrÂuW6VBrÂtçrÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÓBÓB66VçBÖ&ÇVRÓS ¢óà¢Ç7â6Æ74æÖSÒ'FWBÖw&Ó3#ç¶6öæFFöçÓÂ÷7ãà¢ÂöÆ&VÃà¢Ð¢ÂöFcà¢ÂöFcà ¢²ò¢&öGGW2¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFRÖ"ÓB#ä&öGGR&VfW&Væ6SÂö#à¢ÆFb6Æ74æÖSÒ&w&Bw&BÖ6öÇ2Ó"ÖC¦w&BÖ6öÇ2ÓBvÓ2#à¢´$ôEõEUôõDôå2æÖ&öGGRÓâ¢ÆÆ&VÂ¶W×¶&öGGWÒ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ"7W'6÷"×öçFW"#à¢ÆçW@¢GSÒ&6V6¶&÷ ¢6V6¶VC×·&VfW&Væ6W2æ&öG÷GW2ææ6ÇVFW2&öGGRÐ¢öä6ævS×²ÓâFövvÆT&öGGR&öGGRÐ¢6Æ74æÖSÒ'rÓBÓB66VçBÖ&ÇVRÓS ¢óà¢Ç7â6Æ74æÖSÒ'FWBÖw&Ó3#ç¶&öGGWÓÂ÷7ãà¢ÂöÆ&VÃà¢Ð¢ÂöFcà¢ÂöFcà ¢²ò¢æ÷Ff6Föç2¢÷Ð¢ÆFb6Æ74æÖSÒ&&rÖw&FVçB×FòÖ'"g&öÒ×6ÆFRÓó3Fò×6ÆFRÓó3&÷&FW"&÷&FW"×6ÆFRÓsó3&÷VæFVBÓ'ÂÓb#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"§W7FgÖ&WGvVVâ#à¢ÆFb6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"vÓ2#à¢Å¦6Æ74æÖSÒ'rÓRÓRFWB×VÆÆ÷rÓC"óà¢ÆFcà¢Æ"6Æ74æÖSÒ'FWB×ÂföçBÖ&öÆBFWB×vFR#äæ÷Ff6Föç3Âö#à¢Ç6Æ74æÖSÒ'FWB×6ÒFWBÖw&ÓC#ävWBæ÷FfVB&÷WBÖF6ærFVÇ3Â÷à¢ÂöFcà¢ÂöFcà¢ÆÆ&VÂ6Æ74æÖSÒ&fÆWFV×2Ö6VçFW"7W'6÷"×öçFW"#à¢ÆçW@¢GSÒ&6V6¶&÷ ¢6V6¶VC×·&VfW&Væ6W2ææ÷FgöVæ&ÆVGÐ¢öä6ævS×¶RÓà¢6WE&VfW&Væ6W2&WbÓâ°¢ââç&WbÀ¢æ÷FgöVæ&ÆVC¢RçF&vWBæ6V6¶VBÀ¢Ò¢Ð¢6Æ74æÖSÒ'rÓRÓR66VçBÖ&ÇVRÓS ¢óà¢ÂöÆ&VÃà¢ÂöFcà¢ÂöFcà ¢²ò¢6fR'WGFöâ¢÷Ð¢ÆFb6Æ74æÖSÒ&fÆWvÓ2#à¢Æ'WGFöà¢öä6Æ6³×·6fU&VfW&Væ6W7Ð¢F6&ÆVC×·6fæwÐ¢6Æ74æÖSÒ&fÆWÓÓbÓ2&rÖw&FVçB×Fò×"g&öÒÖ&ÇVRÓcFò×W'ÆRÓc÷fW#¦g&öÒÖ&ÇVRÓS÷fW#§Fò×W'ÆRÓSF6&ÆVC¦g&öÒÖw&ÓcF6&ÆVC§FòÖw&ÓsF6&ÆVC¦7W'6÷"Öæ÷BÖÆÆ÷vVBFWB×vFRföçB×6VÖ&öÆB&÷VæFVBÖÆrG&ç6FöâÖÆÂGW&FöâÓ# ¢à¢·6færòu6færâââr¢u6fR&VfW&Væ6W2wÐ¢Âö'WGFöãà¢ÂöFcà¢ÂöFcà¢ÂöFcà¢ÂöFcà¢°§Ð
