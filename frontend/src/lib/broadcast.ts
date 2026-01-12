/**
 * Universal Broadcast Sync System
 * Menggunakan BroadcastChannel API untuk real-time sync antar tabs
 * Lebih reliable daripada CustomEvent karena work across tabs/windows
 */

export type SyncEventType = 
  | 'transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  | 'sync_completed'; // When offline queue synced

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: any;
}

// Create broadcast channel (shared across all tabs)
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize broadcast channel
 */
export function initBroadcastChannel(): BroadcastChannel {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('pos-sync-channel');
    console.log('🎧 [BROADCAST] Channel initialized');
  }
  return broadcastChannel;
}

/**
 * Broadcast event ke semua tabs
 */
export function broadcastSync(type: SyncEventType, data?: any): void {
  const channel = initBroadcastChannel();
  const event: SyncEvent = {
    type,
    timestamp: Date.now(),
    data,
  };
  
  channel.postMessage(event);
  console.log('📢 [BROADCAST] Sent:', type, data);
}

/**
 * Listen untuk sync events
 */
export function onSyncEvent(
  callback: (event: SyncEvent) => void
): () => void {
  const channel = initBroadcastChannel();
  
  const handler = (event: MessageEvent<SyncEvent>) => {
    console.log('📥 [BROADCAST] Received:', event.data.type);
    callback(event.data);
  };
  
  channel.addEventListener('message', handler);
  
  // Return cleanup function
  return () => {
    channel.removeEventListener('message', handler);
  };
}

/**
 * Helper: Invalidate cache berdasarkan event type
 */
export async function handleSyncEvent(event: SyncEvent): Promise<void> {
  const { invalidateTransactionsCache } = await import('./db');
  
  switch (event.type) {
    case 'transaction_created':
    case 'transaction_updated':
    case 'transaction_deleted':
    case 'sync_completed':
      await invalidateTransactionsCache();
      console.log('🗑️ [BROADCAST] Invalidated transactions cache');
      break;
      
    case 'product_created':
    case 'product_updated':
    case 'product_deleted':
      // Products cache invalidation (future)
      sessionStorage.removeItem('products_cache');
      console.log('🗑️ [BROADCAST] Invalidated products cache');
      break;
      
    case 'customer_created':
    case 'customer_updated':
    case 'customer_deleted':
      sessionStorage.removeItem('customers_cache');
      console.log('🗑️ [BROADCAST] Invalidated customers cache');
      break;
      
    case 'category_created':
    case 'category_updated':
    case 'category_deleted':
      sessionStorage.removeItem('categories_cache');
      console.log('🗑️ [BROADCAST] Invalidated categories cache');
      break;
  }
}
