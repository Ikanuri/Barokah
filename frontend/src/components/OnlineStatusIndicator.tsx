'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { isOnline, syncPendingTransactions } from '@/lib/sync';
import { getPendingTransactions } from '@/lib/db';

export default function OnlineStatusIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setOnline(isOnline());
    };

    // Initial check
    updateOnlineStatus();

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Monitor pending transactions count
  useEffect(() => {
    const updatePendingCount = async () => {
      const pending = await getPendingTransactions();
      setPendingCount(pending.length);
    };

    // Initial check
    updatePendingCount();

    // Update setiap 10 detik
    const interval = setInterval(updatePendingCount, 10000);

    // Listen for sync events
    const handleSynced = () => {
      updatePendingCount();
    };

    window.addEventListener('transactionsSynced', handleSynced);

    return () => {
      clearInterval(interval);
      window.removeEventListener('transactionsSynced', handleSynced);
    };
  }, []);

  // Manual sync handler
  const handleManualSync = async () => {
    if (!online || syncing) return;
    
    setSyncing(true);
    await syncPendingTransactions();
    setSyncing(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full shadow-lg
        transition-all duration-300
        ${online 
          ? 'bg-green-500 dark:bg-green-600 text-white' 
          : 'bg-red-500 dark:bg-red-600 text-white'
        }
      `}>
        {/* Status Icon */}
        {online ? (
          <Wifi size={16} />
        ) : (
          <WifiOff size={16} />
        )}

        {/* Status Text */}
        <span className="text-sm font-medium">
          {online ? 'Online' : 'Offline'}
        </span>

        {/* Pending Count Badge */}
        {pendingCount > 0 && (
          <>
            <div className="w-px h-4 bg-white/30" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {pendingCount} pending
            </span>
          </>
        )}

        {/* Manual Sync Button */}
        {online && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw 
              size={14} 
              className={syncing ? 'animate-spin' : ''}
            />
          </button>
        )}
      </div>
    </div>
  );
}
