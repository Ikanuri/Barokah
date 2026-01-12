'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Edit, Trash2, Store, TrendingUp, Package, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface StoreData {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

interface StoreStats {
  total_products: number;
  total_transactions: number;
  total_revenue: number;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [saving, setSaving] = useState(false);
  const [storeStats, setStoreStats] = useState<Record<number, StoreStats>>({});
  const [syncing, setSyncing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stores');
      setStores(response.data);
      
      // Fetch stats for each store
      for (const store of response.data) {
        fetchStoreStats(store.id);
      }
    } catch (error: any) {
      toast.error('Gagal memuat data toko');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreStats = async (storeId: number) => {
    try {
      const response = await api.get(`/stores/${storeId}/stats`);
      setStoreStats(prev => ({
        ...prev,
        [storeId]: response.data
      }));
    } catch (error) {
      console.error(`Failed to fetch stats for store ${storeId}`, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingStore) {
        await api.put(`/stores/${editingStore.id}`, formData);
        toast.success('✅ Toko berhasil diupdate');
      } else {
        await api.post('/stores', formData);
        toast.success('✅ Toko berhasil ditambahkan');
      }
      
      fetchStores();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan toko');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (store: StoreData) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      is_active: store.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus toko ini? Semua data produk dan transaksi toko ini akan ikut terhapus!')) {
      return;
    }
    
    try {
      await api.delete(`/stores/${id}`);
      toast.success('Toko berhasil dihapus');
      fetchStores();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus toko');
      console.error('Delete error:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStore(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      is_active: true
    });
  };

  const handleSyncPrices = async () => {
    if (!confirm('Sinkronisasi harga produk dari toko pusat ke semua toko cabang?')) {
      return;
    }

    try {
      setSyncing(true);
      
      // Get source store (first active store or main store)
      const sourceStore = stores.find(s => s.is_active);
      if (!sourceStore) {
        toast.error('Tidak ada toko aktif untuk disinkronkan');
        return;
      }

      const targetStoreIds = stores
        .filter(s => s.id !== sourceStore.id && s.is_active)
        .map(s => s.id);

      if (targetStoreIds.length === 0) {
        toast.error('Tidak ada toko cabang untuk disinkronkan');
        return;
      }

      const response = await api.post('/stores/sync-prices', {
        source_store_id: sourceStore.id,
        target_store_ids: targetStoreIds,
        sync_type: 'all_products'
      });

      toast.success(`✅ Berhasil sinkronisasi ${response.data.synced_products} produk ke ${response.data.synced_stores} toko`);
      fetchStores();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal sinkronisasi harga');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ios-blue)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Memuat data toko...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Manajemen Toko</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Kelola multiple toko/cabang Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncPrices}
              variant="outline"
              disabled={syncing || stores.length < 2}
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline ml-2">
                {syncing ? 'Sinkronisasi...' : 'Sync Harga'}
              </span>
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={20} className="mr-2" />
              <span className="hidden sm:inline">Tambah Toko</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="glass-card p-4 border-l-4 border-[var(--ios-blue)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">🏪 Fitur Multi-Toko</h3>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1">
            <li>✓ Kelola multiple toko/cabang dengan data terpisah</li>
            <li>✓ Setiap toko memiliki produk dan transaksi sendiri</li>
            <li>✓ Sinkronisasi harga produk dari toko pusat ke cabang</li>
            <li>✓ Laporan statistik per toko</li>
            <li>✓ Kategori produk shared (sama untuk semua toko)</li>
          </ul>
        </div>

        {/* Stores List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const stats = storeStats[store.id];
            
            return (
              <Card key={store.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-[var(--ios-blue)]/10">
                        <Store size={24} className="text-[var(--ios-blue)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">{store.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          store.is_active 
                            ? 'bg-[var(--ios-green)]/20 text-[var(--ios-green)]' 
                            : 'bg-gray-500/20 text-gray-500'
                        }`}>
                          {store.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {store.address && (
                    <p className="text-sm text-[var(--text-secondary)] mb-1">📍 {store.address}</p>
                  )}
                  {store.phone && (
                    <p className="text-sm text-[var(--text-secondary)] mb-4">📞 {store.phone}</p>
                  )}

                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-t border-[var(--separator)]">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[var(--ios-blue)]">{stats.total_products}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Produk</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[var(--ios-green)]">{stats.total_transactions}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Transaksi</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[var(--ios-orange)]">{formatCurrency(stats.total_revenue)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">Revenue</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(store)}
                      className="flex-1"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(store.id)}
                      disabled={stores.length === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {stores.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Store size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Belum ada toko. Tambahkan toko pertama Anda.
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus size={20} className="mr-2" />
                Tambah Toko
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {editingStore ? 'Edit Toko' : 'Tambah Toko'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Nama Toko *"
                    placeholder="Toko Pusat / Cabang 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Alamat"
                    placeholder="Jl. Contoh No. 123"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  <Input
                    label="Nomor Telepon"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-[var(--ios-blue)] rounded"
                    />
                    <label htmlFor="is_active" className="text-sm text-[var(--text-primary)]">
                      Toko Aktif
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Menyimpan...' : editingStore ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
