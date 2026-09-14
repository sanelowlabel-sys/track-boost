import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  PlusCircle,
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Disc3,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'wizard' | 'curators' | 'analytics';
  onSelectTab: (tab: 'dashboard' | 'wizard' | 'curators' | 'analytics') => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, onOpenAuth }) => {
  const { user, isAuthenticated, logout, loginAsDemo } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#121212]/95 backdrop-blur border-b border-[#242424]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-8">
          <button
            id="brand-logo-btn"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center space-x-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E50914] to-[#FF3333] flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform duration-200">
              <Disc3 className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white font-['Space_Grotesk']">
                  Track<span className="text-[#FF3333]">Boost</span>
                </span>
                <span className="bg-[#242424] text-[#B3B3B3] text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border border-[#333333]">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-[#B3B3B3] font-medium tracking-wide">
                Spotify Promotion & Placement
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              id="nav-tab-dashboard"
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-[#1e1e1e] text-white border border-[#333333]'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#FF3333]" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-curators"
              onClick={() => onSelectTab('curators')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'curators'
                  ? 'bg-[#1e1e1e] text-white border border-[#333333]'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Curator Network</span>
            </button>

            <button
              id="nav-tab-analytics"
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#1e1e1e] text-white border border-[#333333]'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Live Analytics</span>
            </button>
          </nav>
        </div>

        {/* Right Action & Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            id="nav-new-campaign-cta"
            onClick={() => onSelectTab('wizard')}
            className="flex items-center space-x-2 bg-[#FF3333] hover:bg-[#e62e2e] active:scale-95 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-[#FF3333]/25 transition-all duration-150 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Launch Campaign</span>
            <span className="sm:hidden">Submit</span>
          </button>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="user-profile-menu-button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2.5 p-1.5 pr-2.5 bg-[#181818] hover:bg-[#202020] border border-[#282828] rounded-xl transition cursor-pointer"
              >
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=80&q=80'}
                  alt={user.name}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#FF3333]/40"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-2.5 h-2.5 inline" /> Verified {user.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#B3B3B3]" />
              </button>

              {isDropdownOpen && (
                <div
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-64 bg-[#181818] border border-[#2c2c2c] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-4 py-2.5 border-b border-[#252525]">
                    <p className="text-xs text-[#B3B3B3]">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-red-950/60 text-[#FF3333] border border-red-800/40 rounded-full font-semibold">
                      Spotify Artist Partner
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectTab('dashboard');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-white hover:bg-[#222] flex items-center space-x-2.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#B3B3B3]" />
                      <span>Campaigns Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectTab('wizard');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-white hover:bg-[#222] flex items-center space-x-2.5"
                    >
                      <Flame className="w-4 h-4 text-[#FF3333]" />
                      <span>Submit New Track</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#252525]">
                    <button
                      id="logout-btn"
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-[#222] flex items-center space-x-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                id="login-trigger-btn"
                onClick={onOpenAuth}
                className="text-xs font-semibold text-white hover:text-white px-3 py-2 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2c2c2c] transition cursor-pointer"
              >
                Sign In
              </button>
              <button
                id="quick-demo-btn"
                onClick={() => loginAsDemo()}
                className="hidden sm:inline-flex text-xs font-semibold text-[#FF3333] hover:text-white px-3 py-2 rounded-lg bg-red-950/30 hover:bg-[#FF3333] border border-red-800/40 transition cursor-pointer"
              >
                Demo Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
