import { useNavigate } from 'react-router-dom';
import { Zap, Lock } from 'lucide-react';
import { useUsageLimit } from '../hooks/useUsageLimit';

export function UpgradeBanner() {
  const { hasReachedLimit, remaining, limit, isProOrAbove } = useUsageLimit();
  const navigate = useNavigate();

  if (isProOrAbove) return null;

  if (hasReachedLimit) {
    return (
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Daily Limit Reached</h3>
            <p className="text-gray-400 text-sm">
              You've used all {limit} free listing views today. Upgrade to Pro for unlimited access, real-time alerts, and market analytics.
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all whitespace-nowrap"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  if (remaining <= 3) {
    return (
      <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-yellow-400">{remaining}</span> free views remaining today.{' '}
            <button onClick={() => navigate('/pricing')} className="text-blue-400 hover:text-blue-300 underline">
              Upgrade for unlimited
            </button>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
