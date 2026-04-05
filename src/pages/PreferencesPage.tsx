import { useState, useEffect } from 'react';
import { Settings, Heart, X, MapPin, DollarSign, Gauge, Car } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';

export function PreferencesPage() {
  const { profile } = useAuth();
  const { preferences, loading, error } = usePreferences();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold">AI Preferences</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Name</p>
              <p className="text-lg font-medium">{profile?.full_name || 'Not set'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Client Type</p>
              <p className="text-lg font-medium capitalize">{profile?.client_type || 'Not set'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Market Location</p>
              <p className="text-lg font-medium">{profile?.market_location || 'Not set'}</p>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Total Likes</h3>
            </div>
            <p className="text-4xl font-bold text-green-400">{preferences?.total_likes || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Deals you loved</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <X className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold">Total Skips</h3>
            </div>
            <p className="text-4xl font-bold text-red-400">{preferences?.total_skips || 0}</p>
            <p className="text-gray-400 text-sm mt-1">Deals you passed on</p>
          </div>
        </div>

        {/* Learned Preferences */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Learned Preferences</h2>
          <p className="text-gray-400 mb-6">These preferences are automatically learned from your likes and skips.</p>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium">Preferred Makes</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {preferences?.preferred_makes && preferences.preferred_makes.length > 0 ? (
                  preferences.preferred_makes.map((make: string) => (
                    <span key={make} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                      {make}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No preferences learned yet. Start browsing deals!</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <h3 className="font-medium">Price Range</h3>
              </div>
              <p className="text-gray-300">
                {preferences?.preferred_price_min || preferences?.preferred_price_max ? (
                  <span>
                    ${(preferences?.preferred_price_min || 0).toLocaleString()} - ${(preferences?.preferred_price_max || 0).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-gray-500">Not enough data yet</span>
                )}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium">Max Mileage</h3>
              </div>
              <p className="text-gray-300">
                {preferences?.preferred_mileage_max ? (
                  <span>{preferences.preferred_mileage_max.toLocaleString()} miles</span>
                ) : (
                  <span className="text-gray-500">Not enough data yet</span>
                )}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-500" />
                <h3 className="font-medium">Preferred Locations</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {preferences?.preferred_locations && preferences.preferred_locations.length > 0 ? (
                  preferences.preferred_locations.map((loc: string) => (
                    <span key={loc} className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">
                      {loc}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No location preferences yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}