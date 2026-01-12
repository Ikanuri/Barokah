'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { User, ShoppingBag, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface TopProduct {
  product_id: number;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
}

interface CashierStat {
  cashier_id: number;
  cashier_name: string;
  total_transactions: number;
  total_revenue: number;
  top_products: TopProduct[];
}

interface CashierStatsResponse {
  cashiers: CashierStat[];
  period: {
    start_date: string;
    end_date: string;
  };
}

export default function CashierStatsPage() {
  const [stats, setStats] = useState<CashierStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split('T')[0] // First day of month
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0] // Today
  );

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/statistics/cashiers', {
        params: {
          start_date: startDate + ' 00:00:00',
          end_date: endDate + ' 23:59:59',
        },
      });
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching cashier stats:', error);
      toast.error('Gagal memuat statistik kasir');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
    if (index === 1) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    if (index === 2) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-700';
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-700';
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '📍';
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            📊 Statistik Kasir & Produk Favorit
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Lihat performa kasir dan produk yang paling sering mereka jual
          </p>
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Periode:</span>
              </div>
              
              {/* Quick Date Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    setStartDate(yesterdayStr);
                    setEndDate(yesterdayStr);
                  }}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Kemarin
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setStartDate(weekAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50"
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    setStartDate(monthAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50"
                >
                  30 Hari Terakhir
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setStartDate(firstDay.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-sm bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50"
                >
                  Bulan Ini
                </button>
              </div>

              {/* Manual Date Inputs */}
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500 dark:text-gray-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={fetchStats}
                  className="px-4 py-2 bg-telegram-blue dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-blue dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat statistik...</p>
          </div>
        ) : !stats || stats.cashiers.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">Tidak ada data untuk periode ini</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Kasir</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stats.cashiers.length}
                      </p>
                    </div>
                    <User size={40} className="text-telegram-blue dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Transaksi</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {stats.cashiers.reduce((sum, c) => sum + c.total_transactions, 0)}
                      </p>
                    </div>
                    <ShoppingBag size={40} className="text-green-600 dark:text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Pendapatan</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(
                          stats.cashiers.reduce((sum, c) => sum + c.total_revenue, 0)
                        )}
                      </p>
                    </div>
                    <DollarSign size={40} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cashier Rankings */}
            <div className="space-y-4">
              {stats.cashiers.map((cashier, index) => (
                <Card key={cashier.cashier_id} className={`border-2 ${getRankColor(index)}`}>
                  <CardContent className="p-6">
                    {/* Cashier Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{getRankEmoji(index)}</div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {cashier.cashier_name}
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs rounded-full font-bold">
                                TOP PERFORMER
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Peringkat #{index + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(cashier.total_revenue)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {cashier.total_transactions} transaksi
                        </p>
                      </div>
                    </div>

                    {/* Top Products */}
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Top 5 Produk Favorit
                      </h4>
                      
                      {cashier.top_products.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">Belum ada produk terjual</p>
                      ) : (
                        <div className="space-y-2">
                          {cashier.top_products.map((product, idx) => (
                            <div
                              key={product.product_id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-telegram-blue dark:hover:border-blue-500 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-telegram-blue to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white flex items-center justify-center font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {product.product_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(product.total_revenue)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {product.total_sold} terjual
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Performance Metrics */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Rata-rata per Transaksi</p>
                          <p className="text-lg font-bold text-telegram-blue dark:text-blue-400">
                            {cashier.total_transactions > 0
                              ? formatCurrency(cashier.total_revenue / cashier.total_transactions)
                              : 'Rp 0'}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Produk Terlaris</p>
                          <p className="text-lg font-bold text-green-700 dark:text-green-400">
                            {cashier.top_products.length > 0
                              ? cashier.top_products[0].total_sold + ' pcs'
                              : '0 pcs'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
