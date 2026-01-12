import api from './api';
import { 
  getPendingTransactions, 
  markTransactionSynced, 
  deleteSyncedTransactions,
  invalidateTransactionsCache 
} from './db';
import { broadcastSync } from './broadcast';
import toast from 'react-hot-toast';

// Flag untuk mencegah multiple sync bersamaan
let isSyncing = false;

/**
 * Check apakah browser online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sync semua pending transactions ke server
 * Dipanggil otomatis saat koneksi kembali online
 */
export async function syncPendingTransactions(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  if (isSyncing) {
    console.log('⏳ [SYNC] Already syncing, skipping...');
    return { success: 0, failed: 0, total: 0 };
  }

  if (!isOnline()) {
    console.log('📵 [SYNC] Offline, cannot sync');
    return { success: 0, failed: 0, total: 0 };
  }

  isSyncing = true;
  console.log('🔄 [SYNC] Starting sync process...');

  try {
    const pending = await getPendingTransactions();
    
    if (pending.length === 0) {
      console.log('✅ [SYNC] No pending transactions');
      return { success: 0, failed: 0, total: 0 };
    }

    console.log(`📤 [SYNC] Found ${pending.length} pending transactions`);
    
    let successCount = 0;
    let failedCount = 0;

    for (const item of pending) {
      try {
        console.log(`📤 [SYNC] Syncing transaction ${item.id}...`);
        
        // Send to server
        await api.post('/transactions', item.transaction);
        
        // Mark as synced
        await markTransactionSynced(item.id);
        successCount++;
        
        console.log(`✅ [SYNC] Transaction ${item.id} synced successfully`);
      } catch (error: any) {
        console.error(`❌ [SYNC] Failed to sync transaction ${item.id}:`, error);
        failedCount++;
        
        // Jika error karena validation, bisa skip (mark as synced)
        if (error.response?.status === 422) {
          console.warn(`⚠️ [SYNC] Validation error, marking as synced to skip: ${item.id}`);
          await markTransactionSynced(item.id);
        }
      }
    }

    // Cleanup synced transactions
    await deleteSyncedTransactions();
    
    // Invalidate cache agar data fresh
    await invalidateTransactionsCache();

    console.log(`✅ [SYNC] Sync complete: ${successCount} success, ${failedCount} failed`);
    
    if (successCount > 0) {
      toast.success(`✅ ${successCount} transaksi berhasil disinkronkan`);
      
      // 🔥 Broadcast ke semua tabs untuk refresh
      broadcastSync('sync_completed', { count: successCount });
    }

    return { success: successCount, failed: failedCount, total: pending.length };
  } catch (error) {
    console.error('❌ [SYNC] Sync process failed:', error);
    return { success: 0, failed: 0, total: 0 };
  } finally {
    isSyncing = false;
  }
}

/**
 * Setup online/offline event listeners
 * Auto-sync saat kembali online
 */
export function setupSyncListeners() {
  console.log('🎧 [SYNC] Setting up online/offline listeners');

  const handleOnline = async () => {
    console.log('🌐 [SYNC] Connection restored, syncing pending transactions...');
    toast.success('📡 Koneksi kembali! Menyinkronkan data...');
    
    // Tunggu sebentar untuk memastikan koneksi stabil
    setTimeout(async () => {
      await syncPendingTransactions();
    }, 1000);
  };

  const handleOffline = () => {
    console.log('📵 [SYNC] Connection lost, entering offline mode');
    toast.error('📵 Offline - Transaksi akan disimpan lokal', {
      duration: 3000,
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial sync saat app load (jika ada pending)
  if (isOnline()) {
    setTimeout(() => {
      syncPendingTransactions();
    }, 2000); // Tunggu 2 detik setelah app load
  }

  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Periodic sync - dipanggil setiap X menit jika online
 */
export function startPeriodicSync(intervalMinutes: number = 5) {
  console.log(`⏰ [SYNC] Starting periodic sync every ${intervalMinutes} minutes`);
  
  const interval = setInterval(async () => {
    if (isOnline()) {
      console.log('⏰ [SYNC] Periodic sync triggered');
      await syncPendingTransactions();
    }
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    console.log('🛑 [SYNC] Stopping periodic sync');
    clearInterval(interval);
  };
}
