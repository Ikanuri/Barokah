'use client';

import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, Upload, AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type RestoreMode = 'overwrite' | 'merge';

interface RestoreStats {
  [table: string]: number;
}

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring]     = useState(false);
  const [mode, setMode]               = useState<RestoreMode>('overwrite');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirm, setConfirm]         = useState(false);
  const [stats, setStats]             = useState<RestoreStats | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/backup/full', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `pos_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh backup');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setStats(null);
    setConfirm(false);
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    setRestoring(true);
    setStats(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('mode', mode);
      const res = await api.post('/backup/restore', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStats(res.data.stats);
      toast.success(res.data.message);
      setConfirm(false);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Restore gagal');
    } finally {
      setRestoring(false);
    }
  };

  const TABLE_LABELS: Record<string, string> = {
    categories:       'Kategori',
    stores:           'Toko',
    customer_tiers:   'Level Pelanggan',
    users:            'Pengguna',
    customers:        'Pelanggan',
    products:         'Produk',
    product_units:    'Satuan Produk',
    product_prices:   'Harga Produk',
    transactions:     'Transaksi',
    transaction_items:'Item Transaksi',
    expenses:         'Arus Kas',
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Backup & Restore</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Backup semua data ke satu file JSON. Restore akan mengembalikan semua data sekaligus.
          </p>
        </div>

        {/* Download */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download size={18} className="text-blue-500" />
              <h2 className="font-semibold text-[var(--text-primary)]">Download Backup</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Mengunduh semua data (produk, transaksi, pelanggan, arus kas, dll.) dalam satu file <code className="bg-[var(--fill-secondary)] px-1 rounded">.json</code>.
            </p>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? 'Menyiapkan...' : 'Download Backup Sekarang'}
            </Button>
          </CardContent>
        </Card>

        {/* Restore */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-orange-500" />
              <h2 className="font-semibold text-[var(--text-primary)]">Restore dari File Backup</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode selector */}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Mode Restore</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('overwrite')}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    mode === 'overwrite'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-[var(--separator)] hover:bg-[var(--fill-secondary)]'
                  }`}
                >
                  <p className="font-semibold text-sm text-[var(--text-primary)]">Timpa Semua</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Hapus data lama, ganti dengan backup
                  </p>
                </button>
                <button
                  onClick={() => setMode('merge')}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    mode === 'merge'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-[var(--separator)] hover:bg-[var(--fill-secondary)]'
                  }`}
                >
                  <p className="font-semibold text-sm text-[var(--text-primary)]">Gabungkan</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Update yang ada, tambah yang baru
                  </p>
                </button>
              </div>
            </div>

            {/* File picker */}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Pilih File Backup</p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-[var(--fill-secondary)] file:text-[var(--text-primary)] hover:file:bg-[var(--fill-primary)] cursor-pointer"
              />
              {selectedFile && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Warning */}
            {selectedFile && mode === 'overwrite' && !confirm && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Mode Timpa: Semua data akan dihapus!
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                    Produk, transaksi, pelanggan, dan semua data lainnya akan diganti sepenuhnya dengan isi file backup.
                  </p>
                  <button
                    onClick={() => setConfirm(true)}
                    className="mt-2 text-xs font-semibold text-orange-700 dark:text-orange-400 underline"
                  >
                    Saya mengerti, lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Restore button */}
            {selectedFile && (mode === 'merge' || confirm) && (
              <Button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {restoring ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {restoring ? 'Sedang restore...' : `Restore (${mode === 'overwrite' ? 'Timpa Semua' : 'Gabungkan'})`}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Restore result */}
        {stats && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <h2 className="font-semibold text-[var(--text-primary)]">Restore Selesai</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(stats).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between p-2 rounded-lg bg-[var(--fill-secondary)]">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {TABLE_LABELS[table] ?? table}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{count} baris</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-3">
                Refresh halaman untuk melihat data yang sudah dipulihkan.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Database size={18} className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Data yang dicakup dalam backup:</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.values(TABLE_LABELS).map(label => (
                    <span key={label} className="text-xs px-2 py-0.5 rounded-full bg-[var(--fill-secondary)] text-[var(--text-secondary)]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
