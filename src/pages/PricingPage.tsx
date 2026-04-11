import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

interface PricingTier {
  name: string;
  price: number;
  description: string;
  highlighted?: boolean;
  features: {
    name: string;
    included: boolean;
  }[];
  buttonText: string;
  buttonAction: 'signup' | 'checkout' | 'contact' | 'current';
  priceId?: string;
}

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, createCheckout, loading } = useSubscription();

  const tiers: PricingTier[] = [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for casual car hunters',
      features: [
        { name: '10 listings per day', included: true },
        { name: 'Basic search & filters', included: true },
        { name: 'Craigslist only', included: true },
        { name: 'Email deal alerts (daily digest)', included: true },
        { name: 'All platforms', included: false },
        { name: 'Real-time SMS + email alerts', included: false },
        { name: 'Market analytics dashboard', included: false },
        { name: 'Deal scoring & price history', included: false },
        { name: 'Unlimited saved searches', included: false },
        { name: 'Export to CSV', included: false },
        { name: 'Multi-user team access', included: false },
        { name: 'Inventory management', included: false },
        { name: 'Profit calculator', included: false },
        { name: 'Competitor price tracking', included: false },
        { name: 'API access', included: false },
        { name: 'Priority support', included: false },
      ],
      buttonText: tier === 'free' ? 'Current Plan' : 'Get Started',
      buttonAction: tier === 'free' ? 'current' : 'signup',
    },
    {
      name: 'Pro',
      price: 49,
      description: 'For serious car dealers and flippers',
      highlighted: true,
      features: [
        { name: '10 listings per day', included: true },
        { name: 'Basic search & filters', included: true },
        { name: 'Craigslist only', included: false },
        { name: 'Email deal alerts (daily digest)', included: false },
        { name: 'All platforms', included: true },
        { name: 'Real-time SMS + email alerts', included: true },
        { name: 'Market analytics dashboard', included: true },
        { name: 'Deal scoring & price history', included: true },
        { name: 'Unlimited saved searches', included: true },
        { name: 'Export to CSV', included: true },
        { name: 'Multi-user team access', included: false },
        { name: 'Inventory management', included: false },
        { name: 'Profit calculator', included: false },
        { name: 'Competitor price tracking', included: false },
        { name: 'API access', included: false },
        { name: 'Priority support', included: false },
      ],
      buttonText: tier === 'pro' ? 'Current Plan' : 'Start Free Trial',
      buttonAction: tier === 'pro' ? 'current' : 'checkout',
      priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
    },    {
      name: 'Dealer',
      price: 149,
      description: 'For large teams and enterprises',
      features: [
        { name: '10 listings per day', included: true },
        { name: 'Basic search & filters', included: true },
        { name: 'Craigslist only', included: false },
        { name: 'Email deal alerts (daily digest)', included: false },
        { name: 'All platforms', included: true },
        { name: 'Real-time SMS + email alerts', included: true },
        { name: 'Market analytics dashboard', included: true },
        { name: 'Deal scoring & price history', included: true },
        { name: 'Unlimited saved searches', included: true },
        { name: 'Export to CSV', included: true },
        { name: 'Multi-user team access', included: true },
        { name: 'Inventory management', included: true },
        { name: 'Profit calculator', included: true },
        { name: 'Competitor price tracking', included: true },
        { name: 'API access', included: true },
        { name: 'Priority support', included: true },
      ],
      buttonText: tier === 'dealer' ? 'Current Plan' : 'Contact Sales',
      buttonAction: tier === 'dealer' ? 'current' : 'contact',
    },
  ];

  const handleButtonClick = async (tierData: PricingTier) => {
    if (tierData.buttonAction === 'signup') {
      navigate('/signup');
    } else if (tierData.buttonAction === 'checkout') {
      if (tierData.priceId && !loading) {
        try {
          await createCheckout(tierData.priceId);
        } catch (error) {
          console.error('Checkout error:', error);
          alert('Failed to start checkout. Please try again.');
        }
      }
    } else if (tierData.buttonAction === 'contact') {
      window.location.href = 'mailto:sales@cardealinghunters.com?subject=Enterprise%20Plan%20Inquiry';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your hunting style. Start free, upgrade whenever you're ready.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
          {tiers.map((tierData) => (
            <div
              key={tierData.name}
              className={`relative rounded-xl border transition-all duration-300 ${
                tierData.highlighted
                  ? 'border-purple-500/50 bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 shadow-2xl shadow-purple-500/20 lg:scale-105'
                  : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600/50'
              }`}
            >
              {/* Highlighted Badge */}
              {tierData.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Tier Name & Description */}
                <h3 className="text-2xl font-bold text-white mb-2">{tierData.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{tierData.description}</p>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">
                    ${tierData.price}
                  </span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleButtonClick(tierData)}
                  disabled={tierData.buttonAction === 'current' || loading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold mb-8 transition-all duration-200 ${
                    tierData.buttonAction === 'current'
                      ? 'bg-gray-700 text-gray-400 cursor-default'
                      : tierData.highlighted
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading && tierData.buttonAction === 'checkout' ? 'Loading...' : tierData.buttonText}
                </button>

                {/* Features List */}
                <div className="space-y-4">
                  {tierData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-500 line-through'}`}
                      >
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-800/30 border-t border-gray-700/50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Is there a free trial for Pro?</h3>
              <p className="text-gray-400">
                Yes! Pro comes with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Do you offer refunds?</h3>
              <p className="text-gray-400">
                We offer a 30-day money-back guarantee if you're not satisfied with your subscription.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-400">
                We accept all major credit and debit cards through Stripe. All payments are secure and encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
