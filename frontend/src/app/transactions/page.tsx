'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import EditTransactionModal from '@/components/EditTransactionModal';
import { ExportImportButtons } from '@/components/ExportImportButtons';
import { Search, Receipt, RefreshCw, XCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { getCachedTransactions, setCachedTransactions } from '@/lib/db';
import { onSyncEvent, handleSyncEvent } from '@/lib/broadcast';

interface Transaction {
  id: number;
  invoice_number: string;
  date: string;
  total: number;
  payment_method: string;
  payment_status?: string;
  payment_amount: number;
  paid_total?: number;
  change: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  } | null;
  guest_name?: string | null;
  cashier: {
    name: string;
  };
  items_count: number;
  status?: string;
  items?: TransactionItem[];
  change_returned?: boolean;
  change_amount?: number;
}

interface TransactionItem {
  id: number;
  product_id?: number;
  product_unit_id?: number | null;
  product_name: string;
  unit_name?: string;
  variant_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<any[]>([]);

  const fetchTransactions = useCallback(async (useCache = true) => {
    try {
      const hasFilters = search || filterDate || filterCustomer || filterCashier || paymentStatusFilter;
      
      if (useCache && !hasFilters) {
        const cached = await getCachedTransactions();
        if (cached) {
          setTransactions(cached.data);
          setTimeout(() => fetchTransactionsInBackground(), 100);
          return;
        }
      }

      setLoading(true);
      const response = await api.get('/transactions', {
        params: { 
          search,
          start_date: filterDate || undefined,
          end_date: filterDate || undefined,
          customer_id: filterCustomer || undefined,
          user_id: filterCashier || undefined,
          payment_status: paymentStatusFilter || undefined,
          per_page: 1000,
        }
      });
      
      const transactionsData = response.data.data || [];
      setTransactions(transactionsData);
      
      if (!hasFilters) await setCachedTransactions(transactionsData);
    } catch (error: any) {
      toast.error('Gagal memuat transaksi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [search, filterDate, filterCustomer, filterCashier, paymentStatusFilter]);

  const fetchTransactionsInBackground = useCallback(async () => {
    try {
      const response = await api.get('/transactions', { params: { per_page: 1000 } });
      const transactionsData = response.data.data || [];
      await setCachedTransactions(transactionsData);
      setTransactions(transactionsData);
    } catch {
      // silent background update
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchCashiers();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const unsubscribe = onSyncEvent(async (event) => {
      await handleSyncEvent(event);
      if (event.type.startsWith('transaction_') || event.type === 'sync_completed') {
        fetchTransactions(false);
      }
    });
    return () => unsubscribe();
  }, [fetchTransactions]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 1000 } });
      setCustomers(response.data.data || []);
    } catch {
      // ignore
    }
  };

  const fetchCashiers = async () => {
    try {
      const response = await api.get('/users', { params: { per_page: 100 } });
      setCashiers(response.data.data || []);
    } catch {
      // ignore
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleViewDetail = async (transaction: Transaction) => {
    try {
      const response = await api.get(`/transactions/${transaction.id}`);
      setSelectedTransaction(response.data.data || response.data);
      setShowDetailModal(true);
    } catch {
      toast.error('Gagal memuat detail transaksi');
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTransaction(null);
  };

  const handleCancelTransaction = async (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation(); // jangan trigger handleViewDetail
    if (transaction.status === 'cancelled') return;
    if (!confirm(`Batalkan transaksi ${transaction.invoice_number}?\nStok produk akan dikembalikan.`)) return;
    try {
      await api.post(`/transactions/${transaction.id}/cancel`);
      toast.success('Transaksi berhasil dibatalkan — stok dikembalikan');
      fetchTransactions(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gagal membatalkan transaksi');
    }
  };


  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        dateFormatted: formatDateOnly(date),
        transactions: grouped[date],
        totalAmount: grouped[date].reduce((sum, t) => sum + t.total, 0),
        count: grouped[date].length,
      }));
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: Record<string, { bg: string; darkBg: string; text: string; darkText: string; label: string }> = {
      cash: { bg: 'bg-green-100', darkBg: 'dark:bg-green-900/30', text: 'text-green-800', darkText: 'dark:text-green-400', label: 'TUNAI' },
      card: { bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/30', text: 'text-blue-800', darkText: 'dark:text-blue-400', label: 'KARTU' },
      transfer: { bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', text: 'text-purple-800', darkText: 'dark:text-purple-400', label: 'TRANSFER' },
      qris: { bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', text: 'text-orange-800', darkText: 'dark:text-orange-400', label: 'QRIS' },
    };
    const badge = badges[method] || badges.cash;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.darkBg} ${badge.text} ${badge.darkText}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Transaksi</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Riwayat transaksi penjualan • {transactions.length} transaksi
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => fetchTransactions(false)}
              disabled={loading}
            >
              <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ExportImportButtons 
              entityType="transactions"
              onImportSuccess={() => fetchTransactions(false)}
              exportFilters={{
                start_date: filterDate,
                end_date: filterDate,
              }}
            />
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            {/* Quick Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setPaymentStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === '' 
                    ? 'bg-telegram-blue dark:bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setPaymentStatusFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'unpaid' 
                    ? 'bg-red-600 dark:bg-red-700 text-white' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                }`}
              >
                🔴 Belum Lunas
              </button>
              <button
                onClick={() => setPaymentStatusFilter('partial')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'partial' 
                    ? 'bg-yellow-600 dark:bg-yellow-700 text-white' 
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                }`}
              >
                🟡 Cicilan
              </button>
              <button
                onClick={() => setPaymentStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'paid' 
                    ? 'bg-green-600 dark:bg-green-700 text-white' 
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
              >
                🟢 Lunas
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Cari nomor invoice..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit">
                  <Search size={20} className="mr-2" />
                  Cari
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                 
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setFilterDate(yesterday.toISOString().split('T')[0]);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Kemarin
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterDate('')}
                        className="flex-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👤 Pelanggan</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                  >
                    <option value="">Semua</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💼 Kasir</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={filterCashier}
                    onChange={(e) => setFilterCashier(e.target.value)}
                  >
                    <option value="">Semua</option>
                    {cashiers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daftar Transaksi</h2>
              {!loading && transactions.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {formatCurrency(transactions.reduce((sum, t) => sum + t.total, 0))}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-telegram-blue dark:border-blue-400"></div>
                <p className="mt-3 text-gray-600 dark:text-gray-400 font-medium">Memuat data transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Receipt size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-700 dark:text-gray-300 font-medium text-lg">Belum ada transaksi</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Transaksi yang dibuat akan muncul di sini</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupTransactionsByDate(transactions).map((group) => (
                  <div key={group.date}>
                    {/* Date Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 md:px-6 py-3 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200">
                          📅 {group.dateFormatted}
                        </h3>
                        <div className="flex items-center gap-3 text-xs md:text-sm">
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded-full font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                            {group.count} transaksi
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full font-bold text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700">
                            {formatCurrency(group.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transactions for this date */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full">
                        <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                          <tr>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Pelanggan / Invoice
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">
                              Waktu
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden lg:table-cell">
                              Kasir
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Items
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Total
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">
                              Status Bayar
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden sm:table-cell">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                          {group.transactions.map((transaction) => (
                            <tr 
                              key={transaction.id} 
                              className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                              onClick={() => handleViewDetail(transaction)}
                            >
                              <td className="px-3 md:px-6 py-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {transaction.customer?.name || transaction.guest_name || 'Umum'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {transaction.invoice_number}
                                </div>
                                {/* Mobile: Show time here */}
                                <div className="text-xs text-gray-400 dark:text-gray-500 md:hidden mt-0.5">
                                  {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden md:table-cell">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden lg:table-cell">
                                <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                  {transaction.cashier.name}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  {transaction.items_count}
                                </span>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(transaction.total)}
                                </div>
                                {transaction.payment_status === 'partial' && transaction.paid_total !== undefined && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Dibayar: {formatCurrency(transaction.paid_total)}
                                  </div>
                                )}
                                
                                <div className="md:hidden mt-1">
                                  {(() => {
                                    const paidTotal = transaction.paid_total || transaction.payment_amount || 0;
                                    const total = transaction.total;
                                    const changeAmount = transaction.change || 0;
                                    if (transaction.change_returned) {
                                      return (
                                        <span className="inline-block text-xs text-amber-600 dark:text-amber-400" title="Kembalian sudah dikembalikan ke pelanggan">
                                          ↩
                                        </span>
                                      );
                                    } else if (changeAmount > 0) {
                                      return (
                                        <span className="inline-block text-xs font-semibold text-green-600 dark:text-green-400">
                                          Kembali: {formatCurrency(changeAmount)}
                                        </span>
                                      );
                                    } else if (paidTotal >= total) {
                                      return (
                                        <span className="inline-block text-xs text-gray-500 dark:text-gray-400">
                                          Lunas ✓
                                        </span>
                                      );
                                    } else {
                                      const shortage = total - paidTotal;
                                      return (
                                        <span className="inline-block text-xs font-semibold text-red-600 dark:text-red-400">
                                          Kurang: {formatCurrency(shortage)}
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-right hidden md:table-cell">
                                {(() => {
                                  const paidTotal = transaction.paid_total || transaction.payment_amount || 0;
                                  const total = transaction.total;
                                  const changeAmount = transaction.change || 0;
                                  if (transaction.change_returned) {
                                    return (
                                      <div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Lunas</div>
                                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" title={`Kembalian ${formatCurrency(Number(transaction.change_amount) || changeAmount)} sudah dikembalikan`}>
                                          ↩
                                        </div>
                                      </div>
                                    );
                                  } else if (changeAmount > 0) {
                                    return (
                                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        Kembalian<br />
                                        {formatCurrency(changeAmount)}
                                      </div>
                                    );
                                  } else if (paidTotal >= total) {
                                    return (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Lunas
                                      </div>
                                    );
                                  } else {
                                    const shortage = total - paidTotal;
                                    return (
                                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                        Kurang<br />
                                        {formatCurrency(shortage)}
                                      </div>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden sm:table-cell">
                                <div className="space-y-1">
                                  {getPaymentMethodBadge(transaction.payment_method)}
                                  {transaction.payment_status === 'unpaid' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                      Belum Lunas
                                    </div>
                                  )}
                                  {transaction.payment_status === 'partial' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                                      Cicilan
                                    </div>
                                  )}
                                  {transaction.payment_status === 'paid' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                      Lunas
                                    </div>
                                  )}
                                  {transaction.status === 'cancelled' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                      Dibatalkan
                                    </div>
                                  )}
                                </div>
                                {transaction.status !== 'cancelled' && (
                                  <button
                                    onClick={(e) => handleCancelTransaction(e, transaction)}
                                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Batalkan transaksi & kembalikan stok"
                                  >
                                    <XCircle size={12} />
                                    Batalkan
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTransaction && (
        <EditTransactionModal
          isOpen={showDetailModal}
          onClose={closeDetailModal}
          transaction={selectedTransaction}
          onUpdate={() => {
            fetchTransactions();
            closeDetailModal();
          }}
        />
      )}
    </Layout>
  );
}
