'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForceRelogin() {
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 Force re-login: Clearing localStorage...');
    
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    
    console.log('✅ localStorage cleared');
    console.log('🔄 Redirecting to login...');
    
    // Wait a bit then redirect
    setTimeout(() => {
      router.push('/login');
    }, 500);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Clearing Session...</h2>
        <p className="text-gray-600">Redirecting to login page...</p>
      </div>
    </div>
  );
}
