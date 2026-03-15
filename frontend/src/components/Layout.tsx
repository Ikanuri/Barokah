'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { setupSyncListeners, startPeriodicSync } from '@/lib/sync';
import OnlineStatusIndicator from '@/components/OnlineStatusIndicator';
import {
  Home,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  TrendingUp,
  Moon,
  Sun,
  Award,
  Store,
  Wallet,
  PieChart,
  ClipboardList,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard', allowedRoles: ['admin', 'manager'] },
  { icon: ShoppingCart, label: 'Kasir', href: '/pos', allowedRoles: ['admin', 'manager', 'kasir'] },
  { icon: Package, label: 'Produk', href: '/products', allowedRoles: ['admin', 'manager'] },
  { icon: BarChart3, label: 'Transaksi', href: '/transactions', allowedRoles: ['admin', 'manager'] },
  { icon: ClipboardList, label: 'Rekap Shift', href: '/shift-recap', allowedRoles: ['admin', 'manager', 'kasir'] },
  { icon: Wallet, label: 'Arus Kas', href: '/cash-flow', allowedRoles: ['admin', 'manager'] },
  { icon: PieChart, label: 'Laba Rugi', href: '/profit-loss', allowedRoles: ['admin', 'manager'] },
  { icon: Store, label: 'Manajemen Toko', href: '/stores', allowedRoles: ['admin'] },
  { icon: TrendingUp, label: 'Statistik Kasir', href: '/cashier-stats', allowedRoles: ['admin', 'manager'] },
  { icon: UserCircle, label: 'Pelanggan', href: '/customers', allowedRoles: ['admin', 'manager'] },
  { icon: Award, label: 'Tier Pelanggan', href: '/customer-tiers', allowedRoles: ['admin', 'manager'] },
  { icon: Users, label: 'Pengguna', href: '/users', allowedRoles: ['admin'] },
  { icon: HardDrive, label: 'Backup & Restore', href: '/backup', allowedRoles: ['admin'] },
  { icon: Settings, label: 'Pengaturan', href: '/settings', allowedRoles: ['admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Tunggu Zustand hydrate dari localStorage sebelum cek auth
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Disable PWA install prompt completely
  useEffect(() => {
    const preventInstallPrompt = (e: Event) => {
      e.preventDefault();
      return false;
    };
    
    window.addEventListener('beforeinstallprompt', preventInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', preventInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const cleanupSyncListeners = setupSyncListeners();
    const cleanupPeriodicSync = startPeriodicSync(5); // Sync every 5 minutes
    
    return () => {
      cleanupSyncListeners();
      cleanupPeriodicSync();
    };
  }, []);

  // Tampilkan spinner saat hydrating atau belum auth — cegah flash konten
  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-8 h-8 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return item.allowedRoles.some((role: string) => user?.roles?.includes(role));
  });

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* Sidebar - Liquid Glass */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 glass-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--separator)]">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--ios-blue)] to-[var(--ios-teal)] bg-clip-text text-transparent">POS Kasir</h1>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-[var(--fill-secondary)] transition-all duration-200 active:scale-95"
                title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              >
                {isDark ? <Sun size={20} className="text-[var(--ios-yellow)]" /> : <Moon size={20} className="text-[var(--ios-purple)]" />}
              </button>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--fill-secondary)] transition-all"
            >
              <X size={20} className="text-[var(--text-primary)]" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-[var(--separator)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
            <div className="mt-2 flex gap-1.5">
              {user?.roles.map(role => (
                <span
                  key={role}
                  className="ios-pill blue text-xs"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-[var(--ios-blue)] text-white shadow-lg shadow-[var(--ios-blue)]/30'
                      : 'text-[var(--text-primary)] hover:bg-[var(--fill-secondary)] active:scale-[0.98]'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle & Logout */}
          <div className="px-4 py-4 border-t border-[var(--separator)] space-y-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-[var(--ios-red)] hover:bg-[var(--ios-red)]/10 rounded-xl transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut size={20} />
              <span className="font-semibold">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Liquid Glass */}
        <header className="glass-navbar px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--fill-secondary)] transition-all active:scale-95"
            >
              <Menu size={24} className="text-[var(--text-primary)]" />
            </button>
            <div className="text-xs md:text-sm text-[var(--text-secondary)] truncate font-medium">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6 bg-[var(--bg-primary)]">
          {children}
        </main>
      </div>

      {/* Online/Offline Status Indicator */}
      <OnlineStatusIndicator />
    </div>
  );
}
