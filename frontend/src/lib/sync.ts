import api from './api';
import {
  getPendingTransactions,
  markTransactionSynced,
  deleteSyncedTransactions,
  invalidateTransactionsCache
} from './db';
import { broadcastSync } from './broadcast';
import toast from 'react-hot-toast';

let isSyncing = false;

export function isOnline(): boolean {
  return navigator.onLine;
}

export async function syncPendingTransactions(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  if (isSyncing || !isOnline()) {
    return { success: 0, failed: 0, total: 0 };
  }

  isSyncing = true;

  try {
    const pending = await getPendingTransactions();
    if (pending.length === 0) {
      return { success: 0, failed: 0, total: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      try {
        await api.post('/transactions', item.transaction);
        await markTransactionSynced(item.id);
        successCount++;
      } catch (error: any) {
        failedCount++;
        // Skip validation errors
        if (error.response?.status === 422) {
          await markTransactionSynced(item.id);
        }
      }
    }

    await deleteSyncedTransactions();
    await invalidateTransactionsCache();

    if (successCount > 0) {
      toast.success(`✅ ${successCount} transaksi berhasil disinkronkan`);
      broadcastSync('sync_completed', { count: successCount });
    }

    return { success: successCount, failed: failedCount, total: pending.length };
  } catch {
    return { success: 0, failed: 0, total: 0 };
  } finally {
    isSyncing = false;
  }
}

export function setupSyncListeners() {
  const handleOnline = async () => {
    toast.success('📡 Koneksi kembali! Menyinkronkan data...');
    setTimeout(async () => {
      await syncPendingTransactions();
    }, 1000);
  };

  const handleOffline = () => {
    toast.error('📵 Offline - Transaksi akan disimpan lokal', { duration: 3000 });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (isOnline()) {
    setTimeout(() => {
      syncPendingTransactions();
    }, 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function startPeriodicSync(intervalMinutes: number = 5) {
  const interval = setInterval(async () => {
    if (isOnline()) {
      await syncPendingTransactions();
    }
  }, intervalMinutes * 60 * 1000);

  return () => {
    clearInterval(interval);
  };
}
