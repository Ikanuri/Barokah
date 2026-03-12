'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cacheCredentials, verifyOfflineCredentials } from '@/lib/db';
import { isOnline } from '@/lib/sync';
import { Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('online');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await api.get('/health', { 
          signal: controller.signal,
          headers: { 'Authorization': '' }
        });
        
        clearTimeout(timeoutId);
        if (isMounted) setBackendStatus('online');
      } catch {
        if (isMounted) setBackendStatus('offline');
      }
    };
    const timer = setTimeout(checkBackend, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [mounted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isOnline()) {
        const user = await verifyOfflineCredentials(email, password);
        
        if (user) {
          const offlineToken = `offline_${Date.now()}`;
          setAuth(user, offlineToken);
          toast.success(`📵 Login Offline: ${user.name}`);
          router.push('/dashboard');
          return;
        } else {
          toast.error('Email atau password salah');
          setLoading(false);
          return;
        }
      }
      
      const response = await api.post('/login', { email, password });
      const { access_token, user } = response.data;

      await cacheCredentials(email, password, user);
      setAuth(user, access_token);
      toast.success(`Selamat datang, ${user.name}!`);
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'Login gagal';
      
      if (error.code === 'ERR_NETWORK') {
        const user = await verifyOfflineCredentials(email, password);
        
        if (user) {
          const offlineToken = `offline_${Date.now()}`;
          setAuth(user, offlineToken);
          toast.success(`📵 Login Offline: ${user.name}`);
          router.push('/dashboard');
          return;
        }
        errorMessage = 'Server tidak tersambung';
      } else if (error.response?.status === 401 || error.response?.status === 422) {
        errorMessage = 'Email atau password salah';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-8 h-8 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden mesh-gradient-bg">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-[var(--ios-blue)]/40 to-[var(--ios-purple)]/30 rounded-full blur-[100px] animate-float" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-[var(--ios-teal)]/30 to-[var(--ios-green)]/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-1.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-[var(--ios-pink)]/20 to-[var(--ios-orange)]/15 rounded-full blur-[80px] animate-float" style={{ animationDelay: '-0.75s' }} />
      </div>

      {/* Theme Toggle - Fixed Top Right */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 glass-button"
        title={isDark ? 'Mode Terang' : 'Mode Gelap'}
      >
        {isDark ? (
          <Sun size={20} className="text-[var(--ios-yellow)]" />
        ) : (
          <Moon size={20} className="text-[var(--ios-purple)]" />
        )}
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 animate-scaleIn">
        <div className="glass-card-solid p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--ios-blue)] via-[var(--ios-purple)] to-[var(--ios-pink)] bg-clip-text text-transparent">
              POS Kasir
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              Silakan login untuk melanjutkan
            </p>
          </div>

          {/* Backend Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              backendStatus === 'checking' 
                ? 'bg-[var(--ios-yellow)] animate-pulse' 
                : backendStatus === 'online' 
                  ? 'bg-[var(--ios-green)]' 
                  : 'bg-[var(--ios-red)]'
            }`} />
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              {backendStatus === 'checking' ? 'Connecting...' :
               backendStatus === 'online' ? 'Server Online' : 'Server Offline'}
            </span>
          </div>

          {/* Offline Warning */}
          {backendStatus === 'offline' && (
            <div className="mb-6 p-4 rounded-2xl bg-[var(--ios-red)]/10 border border-[var(--ios-red)]/20 animate-slideUp">
              <p className="text-sm text-[var(--ios-red)] font-medium">
                ⚠️ Server tidak tersambung
              </p>
              <p className="text-xs text-[var(--ios-red)]/70 mt-1">
                Pastikan backend berjalan di port 8000
              </p>
              <button
                onClick={() => {
                  setBackendStatus('checking');
                  window.location.reload();
                }}
                className="mt-2 text-xs text-[var(--ios-blue)] font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              type="email"
              label="Email"
              placeholder="admin@pos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </span>
              ) : 'Login'}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 rounded-2xl bg-[var(--fill-tertiary)]">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Demo Accounts
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="ios-pill blue text-xs">Admin</span>
                <code className="text-xs text-[var(--text-secondary)] bg-[var(--fill-secondary)] px-2 py-1 rounded-lg">
                  admin@pos.com
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="ios-pill green text-xs">Kasir</span>
                <code className="text-xs text-[var(--text-secondary)] bg-[var(--fill-secondary)] px-2 py-1 rounded-lg">
                  kasir@pos.com
                </code>
              </div>
              <div className="pt-2 mt-2 border-t border-[var(--separator)]">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Password: <code className="bg-[var(--fill-secondary)] px-1.5 py-0.5 rounded">password</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
