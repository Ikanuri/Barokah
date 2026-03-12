'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error reported to boundary
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Terjadi Kesalahan
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Maaf, terjadi kesalahan saat memuat halaman ini.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()}>
            Coba Lagi
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
