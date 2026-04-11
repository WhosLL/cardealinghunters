import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Car, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'text-blue-400 border-b-2 border-blue-400'
      : 'text-gray-300 hover:text-white';
  };

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/browse" className="flex items-center gap-2 text-white font-bold text-xl">
            <Car size={28} className="text-blue-400" />
            <span>CarDealingHunters</span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-8">
              <Link to="/browse" className={`text-sm font-medium ${isActive('/browse')}`}>
                Browse
              </Link>
              <Link to="/saved" className={`text-sm font-medium ${isActive('/saved')}`}>
                Saved Deals
              </Link>
              <Link
                to="/preferences"
                className={`text-sm font-medium ${isActive('/preferences')}`}
              >
                Preferences
              </Link>
              <Link to="/admin" className={`text-sm font-medium ${isActive('/admin')}`}>
                Admin
              </Link>
              <Link to="/pricing" className={`text-sm font-medium ${isActive('/pricing')}`}>
                Pricing
              </Link>
            </div>
          )}

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <>
                <NotificationBell />
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && user && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-4">
            <Link to="/browse" className="block text-gray-300 hover:text-white font-medium" onClick={() => setIsOpen(false)}>
              Browse
            </Link>
            <Link to="/saved" className="block text-gray-300 hover:text-white font-medium" onClick={() => setIsOpen(false)}>
              Saved Deals
            </Link>
            <Link to="/preferences" className="block text-gray-300 hover:text-white font-medium" onClick={() => setIsOpen(false)}>
              Preferences
            </Link>
            <Link to="/admin" className="block text-gray-300 hover:text-white font-medium" onClick={() => setIsOpen(false)}>
              Admin
            </Link>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <NotificationBell />
                <span className="text-gray-300 text-sm">Notifications</span>
              </div>
              <p className="text-sm font-medium text-white mb-2">{profile?.full_name}</p>
              <p className="text-xs text-gray-400 mb-4">{user.email}</p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
