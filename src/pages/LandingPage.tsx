import { useNavigate } from 'react-router-dom';
import { Car, TrendingUp, Bell, BarChart3, DollarSign, Users, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Car,
    title: 'Every Platform, One Dashboard',
    description: 'Craigslist, Facebook Marketplace, OfferUp â all in one place',
  },
  {
    icon: TrendingUp,
    title: 'AI Deal Scoring',
    description: 'Automatically identifies underpriced vehicles based on market data',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Get notified instantly when deals matching your criteria appear',
  },
  {
    icon: BarChart3,
    title: 'Market Analytics',
    description: 'Deep insights into pricing trends and market movement',
  },
  {
    icon: DollarSign,
    title: 'Profit Calculator',
    description: 'Calculate potential profit margins and ROI instantly',
  },
  {
    icon: Users,
    title: 'Works for Everyone',
    description: 'From individual hunters to large dealership teams',
  },
];

const stats = [
  { value: '500+', label: 'Listings Scanned Daily' },
  { value: '10+ hrs', label: 'Saved Per Week' },
  { value: '$2,400', label: 'Average Below Market' },
];

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <nav className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CarDealingHunters</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="px-6 py-2 text-gray-300 hover:text-white transition-colors">Login</button>
            <button onClick={() => navigate('/signup')} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors">Sign Up</button>
          </div>
        </div>
      </nav>
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">Find Underpriced Cars<span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{' '}Before Anyone Else</span></h1>
          <p className="text-xl sm:text-2xl text-gray-400 mb-8 leading-relaxed max-w-3xl mx-auto">CarDealingHunters scans every private-party listing across Craigslist, Facebook Marketplace, and OfferUp â then scores deals so you never overpay.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 group">Start Free<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></button>
            <button onClick={() => navigate('/pricing')} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold text-lg transition-colors">See Pricing</button>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-16 py-12 border-t border-b border-gray-700/50">{stats.map((stat) => (<div key={stat.label}><div className="text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-2">{stat.value}</div><div className="text-sm sm:text-base text-gray-400">{stat.label}</div></div>))}</div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30 border-y border-gray-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful Features for Every Hunter</h2><p className="text-xl text-gray-400">Everything you need to find deals faster and smarter</p></div>
          <div className="grid md:grid-cols-3 gap-8">{features.map((feature) => { const Icon = feature.icon; return (<div key={feature.title} className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50 transition-all duration-300 group"><div className="mb-4"><Icon className="w-12 h-12 text-blue-400 group-hover:text-purple-400 transition-colors" /></div><h3 className="text-xl font-semibold mb-2">{feature.title}</h3><p className="text-gray-400">{feature.description}</p></div>); })}</div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto"><h2 className="text-4xl font-bold text-center mb-12">Trusted by Hundreds of Hunters</h2><div className="grid sm:grid-cols-3 gap-6"><div className="p-8 rounded-xl border border-gray-700/50 bg-gray-800/50 text-center"><div className="text-5xl font-bold text-blue-400 mb-2">500+</div><p className="text-gray-400">New Listings Scanned Daily</p></div><div className="p-8 rounded-xl border border-gray-700/50 bg-gray-800/50 text-center"><div className="text-5xl font-bold text-purple-400 mb-2">50K+</div><p className="text-gray-400">Deals Scored This Month</p></div><div className="p-8 rounded-xl border border-gray-700/50 bg-gray-800/50 text-center"><div className="text-5xl font-bold text-pink-400 mb-2">4.8/5</div><p className="text-gray-400">Average User Rating</p></div></div></div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-700/50"><div className="max-w-4xl mx-auto text-center"><h2 className="text-4xl sm:text-5xl font-bold mb-6">Stop Missing Deals. Start Hunting.</h2><p className="text-xl text-gray-400 mb-8">Join hundreds of car dealers and flippers who are finding better deals in less time.</p><button onClick={() => navigate('/signup')} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-lg transition-all duration-200 inline-flex items-center gap-2 group">Get Started Free<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></button></div></section>
      <footer className="border-t border-gray-700/50 bg-gray-800/50 py-12 px-4 sm:px-6 lg:px-8"><div className="max-w-7xl mx-auto"><div className="border-t border-gray-700/50 pt-8 text-center text-sm text-gray-400"><p>&copy; 2026 CarDealingHunters. All rights reserved.</p></div></div></footer>
    </div>
  );
}
