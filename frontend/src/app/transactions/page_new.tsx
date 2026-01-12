'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Eye, Download, Receipt, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: number;
  invoice_number: string;
  date: string;
  total: number;
  payment_method: string;
  payment_amount: number;
  change: number;
  cashier: {
    name: string;
  };
  items_count: number;
  status?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions', {
        params: { 
          search,
          start_date: startDate,
          end_date: endDate
        }
      });
      console.log('Transaction response:', response.data);
      setTransactions(response.data.data || []);
      if (!search && !startDate && !endDate) {
        toast.success(`Berhasil memuat ${response.data.data?.length || 0} transaksi`);
      }
    } catch (error: any) {
      toast.error('Gagal memuat transaksi');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      cash: { bg: 'bg-green-100', text: 'text-green-800', label: 'TUNAI' },
      card: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'KARTU' },
      transfer: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'TRANSFER' },
      qris: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'QRIS' },
    };
    const badge = badges[method] || badges.cash;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaksi</h1>
            <p className="text-gray-600 mt-1">
              Riwayat transaksi penjualan • {transactions.length} transaksi
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={fetchTransactions}
              disabled={loading}
            >
              <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download size={20} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  type="date"
                  label="Dari Tanggal"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="Sampai Tanggal"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Daftar Transaksi</h2>
              {!loading && transactions.length > 0 && (
                <span className="text-sm text-gray-500">
                  Total: {formatCurrency(transactions.reduce((sum, t) => sum + t.total, 0))}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-telegram-blue"></div>
                <p className="mt-3 text-gray-600 font-medium">Memuat data transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Receipt size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-700 font-medium text-lg">Belum ada transaksi</p>
                <p className="text-gray-500 text-sm mt-2">Transaksi yang dibuat akan muncul di sini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        No. Invoice
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Kasir
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Pembayaran
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {transaction.invoice_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {formatDate(transaction.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {transaction.cashier.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {transaction.items_count} item
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(transaction.total)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentMethodBadge(transaction.payment_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button size="sm" variant="ghost" className="hover:bg-blue-50">
                            <Eye size={16} className="text-telegram-blue" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
