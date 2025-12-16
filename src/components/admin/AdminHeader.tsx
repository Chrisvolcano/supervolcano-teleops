'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sun, 
  Moon, 
  HelpCircle,
  LogOut,
  User,
  ChevronDown,
  ExternalLink,
  Keyboard,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  currentSection: string;
}

export function AdminHeader({ collapsed, onToggleSidebar, currentSection }: AdminHeaderProps) {
  const router = useRouter();
  const { user, claims, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load demo mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sv-demo-mode');
    if (saved === 'true') setDemoMode(true);
  }, []);

  // Save demo mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sv-demo-mode', demoMode.toString());
    // Dispatch custom event so other components can listen
    window.dispatchEvent(new CustomEvent('demo-mode-change', { detail: demoMode }));
  }, [demoMode]);

  const role = (claims?.role as string | undefined) ?? 'admin';

  async function handleSignOut() {
    await logout().catch(() => undefined);
    router.push('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-[#1f1f1f] z-40 flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Logo + Section */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 dark:text-gray-500 tracking-[0.2em] text-sm font-medium">
            SUPERVOLCANO
          </span>
          <span className="text-gray-300 dark:text-gray-600 text-lg">|</span>
          <span className="text-gray-900 dark:text-white tracking-[0.2em] text-sm font-semibold">
            {currentSection}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Demo Mode Toggle */}
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            demoMode
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-[#1f1f1f] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          }`}
          title={demoMode ? 'Switch to live data' : 'Switch to demo mode'}
        >
          {demoMode ? 'Demo' : 'Live'}
        </button>

        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        )}

        {/* Help menu */}
        <div className="relative">
          <button
            onClick={() => { setShowHelpMenu(!showHelpMenu); setShowUserMenu(false); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {showHelpMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHelpMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg z-20 py-2">
                <a
                  href="https://docs.supervolcano.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Documentation
                </a>
                <a
                  href="mailto:support@supervolcano.ai"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                >
                  <HelpCircle className="w-4 h-4" />
                  Support
                </a>
                <div className="border-t border-gray-200 dark:border-[#2a2a2a] my-2" />
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3 h-3" />
                    <span>⌘/Ctrl + B: Toggle sidebar</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowHelpMenu(false); }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] rounded-lg transition-colors"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {role}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg z-20 py-2">
                {/* Email header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.email || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-0.5">
                    {role}
                  </p>
                </div>
                
                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { router.push('/admin/settings'); setShowUserMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                </div>
                
                <div className="border-t border-gray-200 dark:border-[#2a2a2a]" />
                
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
