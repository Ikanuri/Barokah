'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, ShoppingBag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface PLData {
  period: { start: string; end: string };
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  total_discount: number;
  total_transactions: number;
  by_payment_method: Array<{ payment_method: string; count: number; total: string }>;
  top_profitable: Array<{ id: number; name: string; sku: string; total_sold: string; profit: string; revenue: string }>;
  daily: Array<{ date: string; transactions: number; revenue: string; discount: string }>;
}

const PERIOD_PRESETS = [
  { label: 'Hari Ini', getValue: () => ({ start: today(), end: today() }) },
  { label: 'Minggu Ini', getValue: () => ({ start: startOfWeek(), end: today() }) },
  { label: 'Bulan Ini', getValue: () => ({ start: startOfMonth(), end: today() }) },
  { label: 'Bulan Lalu', getValue: () => ({ start: startOfLastMonth(), end: endOfLastMonth() }) },
];

function today() { return new Date().toISOString().split('T')[0]; }
function startOfWeek() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0];
}
function startOfMonth() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function startOfLastMonth() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
}
function endOfLastMonth() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
}

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [data, setData]           = useState<PLData | null>(null);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/profit-loss', {
        params: { start_date: startDate, end_date: endDate },
      });
      setData(res.data.data);
    } catch {
      toast.error('Gagal memuat laporan laba rugi');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyPreset = (preset: typeof PERIOD_PRESETS[0]) => {
    const { start, end } = preset.getValue();
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Laporan Laba Rugi</h1>
            <p className="text-sm text-[var(--text-secondary)]">Omzet, HPP, dan laba kotor per periode</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {PERIOD_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 text-xs rounded-full border border-[var(--separator)] hover:bg-[var(--fill-secondary)] text-[var(--text-secondary)] transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
              <span className="text-[var(--text-secondary)]">s/d</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
              <Button variant="outline" onClick={fetchData} title="Refresh">
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-[var(--fill-secondary)] animate-pulse" />)}
          </div>
        ) : data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)]">Omzet (Revenue)</p>
                  <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(data.revenue)}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{data.total_transactions} transaksi</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)]">HPP (COGS)</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(data.cogs)}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">harga pokok barang</p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${data.gross_profit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)]">Laba Kotor</p>
                  <p className={`text-xl font-bold mt-1 ${data.gross_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.gross_profit)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">omzet - HPP</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)]">Margin Kotor</p>
                  <p className={`text-xl font-bold mt-1 ${data.gross_margin >= 20 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                    {data.gross_margin}%
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">diskon: {formatCurrency(data.total_discount)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Profit breakdown visual */}
            <Card>
              <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Komposisi Pendapatan</h2></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-32 text-[var(--text-secondary)]">Omzet</span>
                    <div className="flex-1 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: '100%' }} />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)] w-32 text-right">{formatCurrency(data.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-32 text-[var(--text-secondary)]">HPP</span>
                    <div className="flex-1 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: data.revenue > 0 ? `${Math.min(100, (data.cogs / data.revenue) * 100)}%` : '0%' }} />
                    </div>
                    <span className="text-sm font-medium text-orange-600 dark:text-orange-400 w-32 text-right">{formatCurrency(data.cogs)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-32 text-[var(--text-secondary)]">Laba Kotor</span>
                    <div className="flex-1 h-5 rounded-full bg-green-100 dark:bg-green-900/30 overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: data.revenue > 0 ? `${Math.min(100, (data.gross_profit / data.revenue) * 100)}%` : '0%' }} />
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 w-32 text-right">{formatCurrency(data.gross_profit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Payment Method */}
              {data.by_payment_method.length > 0 && (
                <Card>
                  <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Metode Pembayaran</h2></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.by_payment_method.map(pm => (
                        <div key={pm.payment_method} className="flex items-center justify-between p-3 rounded-xl bg-[var(--fill-secondary)]">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase">
                              {pm.payment_method}
                            </span>
                            <span className="text-sm text-[var(--text-secondary)]">{pm.count}x</span>
                          </div>
                          <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(parseFloat(pm.total))}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Profitable Products */}
              {data.top_profitable.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-green-500" />
                      <h2 className="font-semibold text-[var(--text-primary)]">Produk Paling Menguntungkan</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.top_profitable.slice(0, 5).map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--fill-secondary)]">
                          <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs flex items-center justify-center font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{p.total_sold} terjual · omzet {formatCurrency(parseFloat(p.revenue))}</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
                            +{formatCurrency(parseFloat(p.profit))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Daily Table */}
            {data.daily.length > 0 && (
              <Card>
                <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Rekap Harian</h2></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--separator)]">
                          <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Tanggal</th>
                          <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Transaksi</th>
                          <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Omzet</th>
                          <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Diskon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily.map(row => (
                          <tr key={row.date} className="border-b border-[var(--separator)] hover:bg-[var(--fill-secondary)]">
                            <td className="py-2 text-[var(--text-primary)]">
                              {new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-2 text-right text-[var(--text-secondary)]">{row.transactions}</td>
                            <td className="py-2 text-right font-medium text-[var(--text-primary)]">{formatCurrency(parseFloat(row.revenue))}</td>
                            <td className="py-2 text-right text-orange-500">{formatCurrency(parseFloat(row.discount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!loading && !data && (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 size={40} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-40" />
              <p className="text-[var(--text-secondary)]">Tidak ada data untuk periode ini</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
