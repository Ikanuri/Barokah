'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  today_transactions: number;
  today_revenue: number;
  today_profit: number;
  total_products: number;
  low_stock_products: number;
  last_7_days: Array<{
    date: string;
    revenue: number;
  }>;
  top_products: Array<{
    id: number;
    name: string;
    total_sold: number;
    total_revenue: number;
  }>;
  top_gainers: {
    daily: Array<{
      id: number;
      name: string;
      sku: string;
      total_sold: number;
      profit: number;
      revenue: number;
    }>;
    weekly: Array<{
      id: number;
      name: string;
      sku: string;
      total_sold: number;
      profit: number;
      revenue: number;
    }>;
    monthly: Array<{
      id: number;
      name: string;
      sku: string;
      total_sold: number;
      profit: number;
      revenue: number;
    }>;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data || response.data);
      setLoading(false);
    } catch (error: any) {
      toast.error('Gagal memuat statistik dashboard: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--text-secondary)]">Memuat data...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-secondary)]">Tidak ada data</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Ringkasan aktivitas toko hari ini
          </p>
        </div>

        {/* Stats Grid - iOS Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Transaksi Hari Ini</p>
                  <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                    {stats.today_transactions || 0}
                  </p>
                </div>
                <div className="p-3 bg-[var(--ios-blue)]/15 rounded-2xl flex-shrink-0 ml-3">
                  <ShoppingCart className="text-[var(--ios-blue)]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Pendapatan Hari Ini</p>
                  <p className="text-lg font-bold mt-2 text-[var(--text-primary)] leading-tight">
                    {formatCurrency(stats.today_revenue || 0)}
                  </p>
                </div>
                <div className="p-3 bg-[var(--ios-green)]/15 rounded-2xl flex-shrink-0 ml-3">
                  <TrendingUp className="text-[var(--ios-green)]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Laba Hari Ini</p>
                  <p className="text-lg font-bold mt-2 text-[var(--ios-orange)] leading-tight">
                    {formatCurrency(stats.today_profit || 0)}
                  </p>
                </div>
                <div className="p-3 bg-[var(--ios-orange)]/15 rounded-2xl flex-shrink-0 ml-3">
                  <TrendingUp className="text-[var(--ios-orange)]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Total Produk</p>
                  <p className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
                    {stats.total_products || 0}
                  </p>
                </div>
                <div className="p-3 bg-[var(--ios-purple)]/15 rounded-2xl flex-shrink-0 ml-3">
                  <Package className="text-[var(--ios-purple)]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Stok Menipis</p>
                  <p className="text-2xl font-bold mt-2 text-[var(--ios-red)]">
                    {stats.low_stock_products || 0}
                  </p>
                </div>
                <div className="p-3 bg-[var(--ios-red)]/15 rounded-2xl flex-shrink-0 ml-3">
                  <AlertTriangle className="text-[var(--ios-red)]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Penjualan 7 Hari Terakhir</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.last_7_days && stats.last_7_days.length > 0 ? (
                  stats.last_7_days.map((day, index) => {
                    const maxRevenue = Math.max(...stats.last_7_days.map(d => d.revenue));
                    const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">{dayName}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(day.revenue)}</span>
                        </div>
                        <div className="w-full bg-[var(--fill-secondary)] rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[var(--ios-blue)] to-[var(--ios-teal)] h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-[var(--text-tertiary)] py-8">
                    Belum ada data penjualan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Produk Terlaris (30 Hari)</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.top_products.length > 0 ? (
                  stats.top_products.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-[var(--fill-secondary)] rounded-xl hover:bg-[var(--fill-primary)] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-[var(--text-tertiary)]">#{index + 1}</span>
                        <span className="font-medium text-[var(--text-primary)]">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{product.total_sold} terjual</div>
                        <div className="text-xs text-[var(--text-secondary)]">{formatCurrency(product.total_revenue)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[var(--text-tertiary)] py-8">
                    Belum ada data penjualan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Gainers Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">🏆 Top Gainers (Produk dengan Laba Tertinggi)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-[var(--ios-blue)]">📅 Hari Ini</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.top_gainers?.daily && stats.top_gainers.daily.length > 0 ? (
                    stats.top_gainers.daily.map((product, index) => (
                      <div key={product.id} className="p-3 bg-[var(--ios-blue)]/10 rounded-xl border border-[var(--ios-blue)]/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-[var(--ios-blue)]">#{index + 1}</span>
                              <span className="font-medium text-sm text-[var(--text-primary)]">{product.name}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[var(--text-secondary)]">Profit</p>
                            <p className="font-bold text-[var(--ios-green)]">{formatCurrency(product.profit)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">Terjual</p>
                            <p className="font-semibold text-[var(--text-primary)]">{product.total_sold} pcs</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[var(--text-tertiary)] py-8 text-sm">
                      Belum ada data hari ini
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-[var(--ios-purple)]">Minggu Ini</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.top_gainers?.weekly && stats.top_gainers.weekly.length > 0 ? (
                    stats.top_gainers.weekly.map((product, index) => (
                      <div key={product.id} className="p-3 bg-[var(--ios-purple)]/10 rounded-xl border border-[var(--ios-purple)]/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-[var(--ios-purple)]">#{index + 1}</span>
                              <span className="font-medium text-sm text-[var(--text-primary)]">{product.name}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[var(--text-secondary)]">Profit</p>
                            <p className="font-bold text-[var(--ios-green)]">{formatCurrency(product.profit)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">Terjual</p>
                            <p className="font-semibold text-[var(--text-primary)]">{product.total_sold} pcs</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[var(--text-tertiary)] py-8 text-sm">
                      Belum ada data minggu ini
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-[var(--ios-orange)]">Bulan Ini</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.top_gainers?.monthly && stats.top_gainers.monthly.length > 0 ? (
                    stats.top_gainers.monthly.map((product, index) => (
                      <div key={product.id} className="p-3 bg-[var(--ios-orange)]/10 rounded-xl border border-[var(--ios-orange)]/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-[var(--ios-orange)]">#{index + 1}</span>
                              <span className="font-medium text-sm text-[var(--text-primary)]">{product.name}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-[var(--text-secondary)]">Profit</p>
                            <p className="font-bold text-[var(--ios-green)]">{formatCurrency(product.profit)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--text-secondary)]">Terjual</p>
                            <p className="font-semibold text-[var(--text-primary)]">{product.total_sold} pcs</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[var(--text-tertiary)] py-8 text-sm">
                      Belum ada data bulan ini
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
