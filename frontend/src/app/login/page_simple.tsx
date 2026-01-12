'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPageSimple() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Attempting login...');
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000/api');
      console.log('Email:', email);
      
      const response = await api.post('/login', { email, password });
      console.log('✅ Login response:', response.data);
      
      const { access_token, user } = response.data;

      setAuth(user, access_token);
      toast.success(`Selamat datang, ${user.name}!`);
      
      console.log('✅ Token saved:', access_token.substring(0, 20) + '...');
      console.log('✅ User saved:', user);
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      
      let errorMessage = 'Login gagal';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = '🔴 Backend tidak tersambung! Pastikan server backend jalan di port 8000.';
      } else if (error.response?.status === 401 || error.response?.status === 422) {
        errorMessage = 'Email atau password salah';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-telegram-blue to-blue-600 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-3xl font-bold text-center text-telegram-blue">
            POS Kasir
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Silakan login untuk melanjutkan
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Demo Accounts:
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                <strong>Admin:</strong> admin@pos.com / password
              </p>
              <p>
                <strong>Kasir:</strong> kasir@pos.com / password
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Pastikan backend jalan:</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              1. Laravel HTTP (port 8080)<br/>
              2. HTTPS Proxy (port 8000)
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Jalankan: <code className="bg-gray-200 px-1 rounded">QUICK-START.bat</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
