'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExportImportButtons } from '@/components/ExportImportButtons';
import { Search, Plus, Edit, Trash2, X, Phone, Mail, MapPin } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface CustomerTier {
  id: number;
  name: string;
  discount_percentage: number;
  minimum_purchase: number;
  color: string;
  icon: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_purchases: number;
  transaction_count: number;
  outstanding_balance: number;
  notes?: string;
  tier_id?: number;
  tier?: CustomerTier;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    tier_id: '',
  });

  useEffect(() => {
    fetchCustomers();
    fetchTiers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // ⚡ CACHE CHECK: Load dari sessionStorage dulu (INSTANT!)
      const cachedData = sessionStorage.getItem('customers_cache');
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        setCustomers(cached);
        setLoading(false);
        console.log(`⚡ [CUSTOMERS CACHE] Loaded ${cached.length} customers from sessionStorage (INSTANT!)`);
        return; // STOP di sini, NO API CALL!
      }
      
      const response = await api.get('/customers', {
        params: { search, per_page: 100 }
      });
      const customersData = response.data.data || [];
      setCustomers(customersData);
      
      // 💾 SAVE to cache
      sessionStorage.setItem('customers_cache', JSON.stringify(customersData));
      console.log(`💾 [CUSTOMERS CACHE] Saved ${customersData.length} customers to sessionStorage`);
    } catch (error: any) {
      toast.error('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await api.get('/customer-tiers');
      const tiersData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setTiers(tiersData);
    } catch (error: any) {
      console.error('Failed to fetch tiers:', error);
      setTiers([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        toast.success('Pelanggan berhasil diupdate');
      } else {
        await api.post('/customers', formData);
        toast.success('Pelanggan berhasil ditambahkan');
      }

      setShowModal(false);
      resetForm();
      
      // 🗑️ CLEAR CACHE setelah create/update
      sessionStorage.removeItem('customers_cache');
      console.log('🗑️ [CUSTOMERS CACHE] Cleared after customer mutation');
      
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
      tier_id: customer.tier_id?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus pelanggan ini?')) return;

    try {
      await api.delete(`/customers/${id}`);
      toast.success('Pelanggan berhasil dihapus');
      
      // 🗑️ CLEAR CACHE setelah delete
      sessionStorage.removeItem('customers_cache');
      console.log('🗑️ [CUSTOMERS CACHE] Cleared after customer deletion');
      
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus pelanggan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      tier_id: '',
    });
    setEditingCustomer(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold dark:text-gray-100">Pelanggan</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Kelola data pelanggan</p>
          </div>
          <div className="flex gap-2">
            <ExportImportButtons 
              entityType="customers"
              onImportSuccess={() => fetchCustomers()}
            />
            <Button onClick={openAddModal}>
              <Plus size={20} className="mr-2" />
              Tambah Pelanggan
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <Input
                  type="text"
                  placeholder="Cari nama, telepon, atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Cari</Button>
            </form>
          </CardContent>
        </Card>

        {/* Customer List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">Memuat data...</div>
            </div>
          ) : customers.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-600 dark:text-gray-400">Tidak ada data pelanggan</div>
            </div>
          ) : (
            customers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg dark:text-gray-100">{customer.name}</h3>
                        {customer.tier && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                            style={{ 
                              backgroundColor: customer.tier.color + '20',
                              color: customer.tier.color 
                            }}
                          >
                            {customer.tier.icon} {customer.tier.name}
                          </span>
                        )}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Phone size={14} />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Mail size={14} />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="border-t dark:border-gray-600 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Belanja:</span>
                      <span className="font-semibold dark:text-gray-100">{formatCurrency(customer.total_purchases)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Transaksi:</span>
                      <span className="font-semibold dark:text-gray-100">{customer.transaction_count}×</span>
                    </div>
                    {customer.outstanding_balance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hutang:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(customer.outstanding_balance)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-gray-100">
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Nama <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama pelanggan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Telepon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="08123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Alamat</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-telegram-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Tier Pelanggan</label>
                <select
                  value={formData.tier_id}
                  onChange={(e) => setFormData({ ...formData, tier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-telegram-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Pilih Tier (Opsional)</option>
                  {Array.isArray(tiers) && tiers.length > 0 ? (
                    tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.icon} {tier.name} - Diskon {tier.discount_percentage}%
                      </option>
                    ))
                  ) : null}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tier akan otomatis berubah berdasarkan total pembelian
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-telegram-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingCustomer ? 'Update' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
