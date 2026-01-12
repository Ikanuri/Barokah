import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Schema untuk database POS
interface POSDatabase extends DBSchema {
  transactions: {
    key: string;
    value: {
      data: any[];
      timestamp: number;
    };
  };
  products: {
    key: string;
    value: {
      data: any[];
      timestamp: number;
    };
  };
  categories: {
    key: string;
    value: {
      data: any[];
      timestamp: number;
    };
  };
  pendingTransactions: {
    key: number;
    value: {
      id: number;
      transaction: any;
      timestamp: number;
      synced: boolean;
    };
  };
  credentials: {
    key: string; // email
    value: {
      email: string;
      passwordHash: string; // SHA-256 hash
      user: any;
      timestamp: number;
    };
  };
}

// Cache TTL: 1 jam (sama seperti sebelumnya)
const CACHE_TTL = 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase<POSDatabase>> | null = null;

// Initialize database
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<POSDatabase>('pos-db', 2, { // Bump version to 2
      upgrade(db, oldVersion) {
        // Store untuk cache transactions
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions');
        }
        
        // Store untuk cache products
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products');
        }
        
        // Store untuk cache categories
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories');
        }
        
        // Store untuk offline transactions queue
        if (!db.objectStoreNames.contains('pendingTransactions')) {
          db.createObjectStore('pendingTransactions', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
        
        // Store untuk offline credentials (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('credentials')) {
          db.createObjectStore('credentials');
        }
      },
    });
  }
  return dbPromise;
}

// ============================================
// TRANSACTIONS CACHE
// ============================================

export async function getCachedTransactions(): Promise<{ data: any[]; timestamp: number } | null> {
  try {
    const db = await getDB();
    const cached = await db.get('transactions', 'cache');
    
    if (!cached) {
      console.log('📭 [IndexedDB] No transactions cache found');
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    
    if (age > CACHE_TTL) {
      console.log('⏰ [IndexedDB] Transactions cache expired (age:', Math.round(age / 1000), 's)');
      return null;
    }
    
    console.log('✅ [IndexedDB] Found valid transactions cache:', cached.data.length, 'items (age:', Math.round(age / 1000), 's)');
    return cached;
  } catch (error) {
    console.error('❌ [IndexedDB] Error getting transactions cache:', error);
    return null;
  }
}

export async function setCachedTransactions(data: any[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put('transactions', {
      data,
      timestamp: Date.now(),
    }, 'cache');
    console.log('💾 [IndexedDB] Cached', data.length, 'transactions');
  } catch (error) {
    console.error('❌ [IndexedDB] Error caching transactions:', error);
  }
}

export async function invalidateTransactionsCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('transactions', 'cache');
    console.log('🗑️ [IndexedDB] Invalidated transactions cache');
  } catch (error) {
    console.error('❌ [IndexedDB] Error invalidating cache:', error);
  }
}

// ============================================
// PRODUCTS CACHE
// ============================================

export async function getCachedProducts(): Promise<{ data: any[]; timestamp: number } | null> {
  try {
    const db = await getDB();
    const cached = await db.get('products', 'cache');
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) return null;
    
    console.log('✅ [IndexedDB] Found valid products cache:', cached.data.length, 'items');
    return cached;
  } catch (error) {
    console.error('❌ [IndexedDB] Error getting products cache:', error);
    return null;
  }
}

export async function setCachedProducts(data: any[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put('products', {
      data,
      timestamp: Date.now(),
    }, 'cache');
    console.log('💾 [IndexedDB] Cached', data.length, 'products');
  } catch (error) {
    console.error('❌ [IndexedDB] Error caching products:', error);
  }
}

// ============================================
// CATEGORIES CACHE
// ============================================

export async function getCachedCategories(): Promise<{ data: any[]; timestamp: number } | null> {
  try {
    const db = await getDB();
    const cached = await db.get('categories', 'cache');
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) return null;
    
    console.log('✅ [IndexedDB] Found valid categories cache:', cached.data.length, 'items');
    return cached;
  } catch (error) {
    console.error('❌ [IndexedDB] Error getting categories cache:', error);
    return null;
  }
}

export async function setCachedCategories(data: any[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put('categories', {
      data,
      timestamp: Date.now(),
    }, 'cache');
    console.log('💾 [IndexedDB] Cached', data.length, 'categories');
  } catch (error) {
    console.error('❌ [IndexedDB] Error caching categories:', error);
  }
}

// ============================================
// OFFLINE QUEUE (untuk transaksi offline)
// ============================================

export async function addPendingTransaction(transaction: any): Promise<number> {
  try {
    const db = await getDB();
    const id = await db.add('pendingTransactions', {
      id: Date.now(),
      transaction,
      timestamp: Date.now(),
      synced: false,
    });
    console.log('📥 [IndexedDB] Added pending transaction:', id);
    return id as number;
  } catch (error) {
    console.error('❌ [IndexedDB] Error adding pending transaction:', error);
    throw error;
  }
}

export async function getPendingTransactions(): Promise<any[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('pendingTransactions');
    const pending = all.filter(item => !item.synced);
    console.log('📤 [IndexedDB] Found', pending.length, 'pending transactions');
    return pending;
  } catch (error) {
    console.error('❌ [IndexedDB] Error getting pending transactions:', error);
    return [];
  }
}

export async function markTransactionSynced(id: number): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('pendingTransactions', 'readwrite');
    const item = await tx.store.get(id);
    if (item) {
      item.synced = true;
      await tx.store.put(item);
      console.log('✅ [IndexedDB] Marked transaction', id, 'as synced');
    }
  } catch (error) {
    console.error('❌ [IndexedDB] Error marking transaction synced:', error);
  }
}

export async function deleteSyncedTransactions(): Promise<void> {
  try {
    const db = await getDB();
    const all = await db.getAll('pendingTransactions');
    const synced = all.filter(item => item.synced);
    
    for (const item of synced) {
      await db.delete('pendingTransactions', item.id);
    }
    
    console.log('🗑️ [IndexedDB] Deleted', synced.length, 'synced transactions');
  } catch (error) {
    console.error('❌ [IndexedDB] Error deleting synced transactions:', error);
  }
}

// ============================================
// OFFLINE AUTHENTICATION
// ============================================

/**
 * Hash password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cache credentials after successful online login
 */
export async function cacheCredentials(email: string, password: string, user: any): Promise<void> {
  try {
    const db = await getDB();
    const passwordHash = await hashPassword(password);
    
    await db.put('credentials', {
      email,
      passwordHash,
      user,
      timestamp: Date.now(),
    }, email);
    
    console.log('💾 [IndexedDB] Cached credentials for offline login');
  } catch (error) {
    console.error('❌ [IndexedDB] Error caching credentials:', error);
  }
}

/**
 * Verify credentials for offline login
 */
export async function verifyOfflineCredentials(email: string, password: string): Promise<any | null> {
  try {
    const db = await getDB();
    const cached = await db.get('credentials', email);
    
    if (!cached) {
      console.log('📭 [IndexedDB] No cached credentials for', email);
      return null;
    }
    
    const passwordHash = await hashPassword(password);
    
    if (cached.passwordHash === passwordHash) {
      console.log('✅ [IndexedDB] Offline login successful');
      return cached.user;
    } else {
      console.log('❌ [IndexedDB] Wrong password for offline login');
      return null;
    }
  } catch (error) {
    console.error('❌ [IndexedDB] Error verifying offline credentials:', error);
    return null;
  }
}
