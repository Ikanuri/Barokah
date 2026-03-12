/**
 * Universal Broadcast Sync System
 * Menggunakan BroadcastChannel API untuk real-time sync antar tabs
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
  | 'sync_completed';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: any;
}

let broadcastChannel: BroadcastChannel | null = null;

export function initBroadcastChannel(): BroadcastChannel {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('pos-sync-channel');
  }
  return broadcastChannel;
}

export function broadcastSync(type: SyncEventType, data?: any): void {
  const channel = initBroadcastChannel();
  channel.postMessage({ type, timestamp: Date.now(), data });
}

export function onSyncEvent(
  callback: (event: SyncEvent) => void
): () => void {
  const channel = initBroadcastChannel();

  const handler = (event: MessageEvent<SyncEvent>) => {
    callback(event.data);
  };

  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

export async function handleSyncEvent(event: SyncEvent): Promise<void> {
  const { invalidateTransactionsCache } = await import('./db');

  switch (event.type) {
    case 'transaction_created':
    case 'transaction_updated':
    case 'transaction_deleted':
    case 'sync_completed':
      await invalidateTransactionsCache();
      break;

    case 'product_created':
    case 'product_updated':
    case 'product_deleted':
      sessionStorage.removeItem('products_cache');
      break;

    case 'customer_created':
    case 'customer_updated':
    case 'customer_deleted':
      sessionStorage.removeItem('customers_cache');
      break;

    case 'category_created':
    case 'category_updated':
    case 'category_deleted':
      sessionStorage.removeItem('categories_cache');
      break;
  }
}
