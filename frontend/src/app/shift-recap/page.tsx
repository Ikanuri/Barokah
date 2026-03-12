'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ClipboardList, RefreshCw, Printer, ShoppingCart, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface ShiftData {
  date: string;
  total_transactions: number;
  total_revenue: number;
  total_discount: number;
  by_payment_method: Record<string, { count: number; total: number }>;
  top_items: Array<{ name: string; qty: number; total: number }>;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function ShiftRecapPage() {
  const { user } = useAuthStore();
  const isAdmin   = user?.roles?.includes('admin') || user?.roles?.includes('manager');

  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [userId, setUserId]   = useState('');
  const [users, setUsers]     = useState<User[]>([]);
  const [data, setData]       = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users');
      setUsers(res.data.data ?? res.data);
    } catch { /* non-critical */ }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { date };
      if (userId) params.user_id = userId;
      const res = await api.get('/dashboard/shift-recap', { params });
      setData(res.data.data);
    } catch {
      toast.error('Gagal memuat rekap shift');
    } finally {
      setLoading(false);
    }
  }, [date, userId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rekap Shift</h1>
            <p className="text-sm text-[var(--text-secondary)]">Ringkasan penjualan per shift / hari</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" />
            {isAdmin && (
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none"
              >
                <option value="">Semua Kasir</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <Button variant="outline" onClick={fetchData} title="Refresh">
              <RefreshCw size={16} />
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h2 className="text-xl font-bold">REKAP SHIFT KASIR</h2>
          <p className="text-sm">Tanggal: {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          {userId && users.find(u => u.id === parseInt(userId)) && (
            <p className="text-sm">Kasir: {users.find(u => u.id === parseInt(userId))?.name}</p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--fill-secondary)] animate-pulse" />)}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardList size={40} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-40" />
              <p className="text-[var(--text-secondary)]">Tidak ada data untuk tanggal ini</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart size={16} className="text-blue-500" />
                    <p className="text-xs text-[var(--text-secondary)]">Total Transaksi</p>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{data.total_transactions}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-green-500" />
                    <p className="text-xs text-[var(--text-secondary)]">Total Penjualan</p>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.total_revenue)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Total Diskon</p>
                  <p className="text-xl font-bold text-orange-500">{formatCurrency(data.total_discount)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Rata-rata / Transaksi</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {data.total_transactions > 0 ? formatCurrency(data.total_revenue / data.total_transactions) : '-'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            {Object.keys(data.by_payment_method).length > 0 && (
              <Card>
                <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Breakdown Metode Pembayaran</h2></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(data.by_payment_method).map(([method, val]) => (
                      <div key={method} className="p-4 rounded-xl bg-[var(--fill-secondary)] flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[var(--text-secondary)] uppercase font-medium">{method}</p>
                          <p className="font-bold text-[var(--text-primary)]">{formatCurrency(val.total)}</p>
                        </div>
                        <span className="text-sm text-[var(--text-secondary)]">{val.count}x</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Items */}
            {data.top_items.length > 0 && (
              <Card>
                <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Item Terlaris Hari Ini</h2></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--separator)]">
                          <th className="text-left py-2 text-[var(--text-secondary)] font-medium w-8">#</th>
                          <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Produk</th>
                          <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Qty Terjual</th>
                          <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.top_items.map((item, idx) => (
                          <tr key={item.name} className="border-b border-[var(--separator)] hover:bg-[var(--fill-secondary)]">
                            <td className="py-2 text-[var(--text-secondary)]">{idx + 1}</td>
                            <td className="py-2 font-medium text-[var(--text-primary)]">{item.name}</td>
                            <td className="py-2 text-right text-[var(--text-primary)]">{item.qty}</td>
                            <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Print Footer */}
            <div className="hidden print:block text-center text-sm text-gray-500 border-t pt-4 mt-4">
              <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
