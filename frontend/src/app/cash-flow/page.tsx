'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Edit, Trash2, X, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

const CATEGORIES: Record<string, string> = {
  operasional:     'Operasional',
  pembelian_stok:  'Pembelian Stok',
  gaji:            'Gaji & Upah',
  sewa:            'Sewa',
  utilitas:        'Listrik / Air / Internet',
  lainnya:         'Lainnya',
};

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  notes?: string;
  user?: { name: string };
}

interface CashFlowSummary {
  period: { start: string; end: string };
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  expenses_by_category: Record<string, { total: string }>;
  daily: Array<{ date: string; income: number; expenses: number; transactions: number }>;
}

const emptyForm = {
  category: 'operasional',
  description: '',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function CashFlowPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate]     = useState(today);
  const [summary, setSummary]     = useState<CashFlowSummary | null>(null);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, expensesRes] = await Promise.all([
        api.get('/expenses/summary', { params: { start_date: startDate, end_date: endDate } }),
        api.get('/expenses', { params: { start_date: startDate, end_date: endDate } }),
      ]);
      setSummary(summaryRes.data.data);
      setExpenses(expensesRes.data.data);
    } catch {
      toast.error('Gagal memuat data arus kas');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (e: Expense) => {
    setEditId(e.id);
    setForm({
      category:     e.category,
      description:  e.description,
      amount:       e.amount,
      expense_date: e.expense_date,
      notes:        e.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.expense_date) {
      toast.error('Deskripsi, jumlah, dan tanggal wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/expenses/${editId}`, form);
        toast.success('Pengeluaran diperbarui');
      } else {
        await api.post('/expenses', form);
        toast.success('Pengeluaran ditambahkan');
      }
      setShowForm(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Pengeluaran dihapus');
      fetchAll();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const netColor = summary && summary.net_cash_flow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Arus Kas</h1>
            <p className="text-sm text-[var(--text-secondary)]">Pemasukan dari penjualan & pengeluaran operasional</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
            <span className="text-[var(--text-secondary)]">s/d</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
            <Button variant="outline" onClick={fetchAll} title="Refresh">
              <RefreshCw size={16} />
            </Button>
            <Button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus size={16} /> Tambah Pengeluaran
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-[var(--fill-secondary)] animate-pulse" />)}
          </div>
        ) : summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Pemasukan</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.total_income)}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">dari transaksi terbayar</p>
                  </div>
                  <TrendingUp size={36} className="text-green-500 opacity-30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.total_expenses)}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">semua kategori</p>
                  </div>
                  <TrendingDown size={36} className="text-red-500 opacity-30" />
                </div>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${summary.net_cash_flow >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Saldo Bersih</p>
                    <p className={`text-2xl font-bold ${netColor}`}>{formatCurrency(summary.net_cash_flow)}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">pemasukan - pengeluaran</p>
                  </div>
                  <DollarSign size={36} className="text-blue-500 opacity-30" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expenses by Category */}
        {summary && Object.keys(summary.expenses_by_category).length > 0 && (
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Pengeluaran per Kategori</h2></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(summary.expenses_by_category).map(([cat, data]) => (
                  <div key={cat} className="p-3 rounded-xl bg-[var(--fill-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">{CATEGORIES[cat] ?? cat}</p>
                    <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(parseFloat(data.total))}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily table */}
        {summary && summary.daily.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--text-primary)]">Rekap Harian</h2></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--separator)]">
                      <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Tanggal</th>
                      <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Transaksi</th>
                      <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Pemasukan</th>
                      <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Pengeluaran</th>
                      <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.daily.map(row => {
                      const net = row.income - row.expenses;
                      return (
                        <tr key={row.date} className="border-b border-[var(--separator)] hover:bg-[var(--fill-secondary)]">
                          <td className="py-2 text-[var(--text-primary)]">{new Date(row.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                          <td className="py-2 text-right text-[var(--text-secondary)]">{row.transactions}</td>
                          <td className="py-2 text-right text-green-600 dark:text-green-400">{formatCurrency(row.income)}</td>
                          <td className="py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(row.expenses)}</td>
                          <td className={`py-2 text-right font-medium ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600'}`}>{formatCurrency(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--text-primary)]">Daftar Pengeluaran</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-[var(--fill-secondary)] animate-pulse" />)}</div>
            ) : expenses.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] py-8">Belum ada pengeluaran di periode ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--separator)]">
                      <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Tanggal</th>
                      <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Kategori</th>
                      <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Deskripsi</th>
                      <th className="text-right py-2 text-[var(--text-secondary)] font-medium">Jumlah</th>
                      <th className="text-left py-2 text-[var(--text-secondary)] font-medium">Dicatat oleh</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={exp.id} className="border-b border-[var(--separator)] hover:bg-[var(--fill-secondary)]">
                        <td className="py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(exp.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-0.5 rounded-full bg-[var(--fill-secondary)] text-xs text-[var(--text-secondary)]">
                            {CATEGORIES[exp.category] ?? exp.category}
                          </span>
                        </td>
                        <td className="py-2 text-[var(--text-primary)]">
                          {exp.description}
                          {exp.notes && <span className="text-xs text-[var(--text-secondary)] ml-1">· {exp.notes}</span>}
                        </td>
                        <td className="py-2 text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(parseFloat(exp.amount))}
                        </td>
                        <td className="py-2 text-[var(--text-secondary)] text-xs">{exp.user?.name ?? '-'}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(exp)} className="p-1.5 hover:bg-[var(--fill-secondary)] rounded-lg text-blue-500">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(exp.id)} className="p-1.5 hover:bg-[var(--fill-secondary)] rounded-lg text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-elevated)] rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-[var(--fill-secondary)] rounded-lg">
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORIES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Deskripsi *</label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contoh: Bayar listrik bulan Maret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Jumlah (Rp) *</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Tanggal *</label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Catatan</label>
                <Input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
