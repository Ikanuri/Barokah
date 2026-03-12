'use client';

import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings as SettingsIcon, Save, Download, Upload, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('POS Kasir Toko');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda!');
  
  // Backup states
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulasi save - nanti bisa disambungkan ke API
    toast.success('Pengaturan berhasil disimpan');
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      const response = await api.get('/backup/full', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBackupFileName(fileName);
      toast.success('✅ Backup berhasil didownload!');
      
      // Show share dialog
      setTimeout(() => {
        setShowShareDialog(true);
      }, 500);
    } catch (error: any) {
      toast.error('❌ Backup gagal: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreClick = () => {
    setShowRestoreDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRestore(file);
    }
  };

  const handleRestore = async (file: File) => {
    try {
      setIsRestoring(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', restoreMode);

      const response = await api.post('/backup/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      let message = '✅ Restore berhasil!\n\n';
      message += `📊 Statistik:\n`;
      message += `- Kategori: ${response.data.stats.categories}\n`;
      message += `- Produk: ${response.data.stats.products}\n`;
      message += `- Transaksi: ${response.data.stats.transactions}\n`;
      
      toast.success(message);
      setShowRestoreDialog(false);
      
      // Refresh halaman setelah 2 detik
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.error('❌ Restore gagal: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenTelegram = () => {
    toast.success('📱 File sudah didownload! Share via Telegram/WhatsApp', { duration: 4000 });
    setShowShareDialog(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pengaturan</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Atur konfigurasi aplikasi dan toko
          </p>
        </div>

        {/* Store Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <SettingsIcon size={24} />
              Informasi Toko
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Nama Toko"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nama toko Anda"
              />
              <Input
                label="Alamat Toko"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Alamat lengkap toko"
              />
              <Input
                label="Nomor Telepon"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="08xx xxxx xxxx"
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Footer Struk
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={3}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Pesan pada footer struk"
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit">
                  <Save size={20} className="mr-2" />
                  Simpan Pengaturan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pengaturan Sistem</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Versi Aplikasi</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">v1.0.0</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Database</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">MySQL - pos_kasir</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Mode</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Development</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Backup & Restore</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-2">
                  💡 Backup & Restore Lengkap:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li><strong>Backup FULL</strong> - Semua data: Produk (units, varian, harga), Kategori, Transaksi, Customer, User</li>
                  <li><strong>Restore</strong> - Pilih mode: Merge (gabung) atau Overwrite (timpa semua)</li>
                  <li>Lakukan backup berkala (minimal 1x seminggu)</li>
                  <li>Simpan file backup di cloud storage atau external drive</li>
                  <li>Share file via Telegram/WhatsApp untuk backup cloud instant</li>
                </ul>
              </div>

              {/* Backup Actions */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📥 Download Backup</h3>
                <Button 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download size={20} className="mr-2" />
                  {isBackingUp ? '⏳ Membuat Backup...' : 'Backup Sekarang'}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Download backup (JSON) → Share via Telegram/WhatsApp
                </p>
              </div>

              {/* Restore Actions */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📤 Restore dari Backup</h3>
                <Button 
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                >
                  <Upload size={20} className="mr-2" />
                  {isRestoring ? '⏳ Restoring...' : 'Restore dari File'}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Upload file backup (.json) untuk restore data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Backup Dialog */}
        {showShareDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4 dark:text-gray-100">✅ Backup Berhasil</h3>
              
              <div className="mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-900 dark:text-green-300 font-medium mb-2">
                    📦 File telah didownload:
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-400 break-all">
                    {backupFileName}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    💡 Rekomendasi: Simpan backup di cloud
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">📱</span>
                      <div>
                        <strong>Telegram:</strong> Kirim ke <em>Saved Messages</em> atau grup pribadi
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">💬</span>
                      <div>
                        <strong>WhatsApp:</strong> Kirim ke chat pribadi Anda
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">☁️</span>
                      <div>
                        <strong>Google Drive:</strong> Upload manual ke folder backup
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleOpenTelegram}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mengerti
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Dialog */}
        {showRestoreDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Restore dari Backup</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Mode Restore:</label>
                <div className="space-y-2">
                  <label className="flex items-start p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={(e) => setRestoreMode(e.target.value as 'merge')}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <strong className="block dark:text-gray-100">Merge (Gabung)</strong>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Update data yang ada, tambah data baru. Transaksi yang ada tidak akan diubah.
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border border-red-300 dark:border-red-700 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="overwrite"
                      checked={restoreMode === 'overwrite'}
                      onChange={(e) => setRestoreMode(e.target.value as 'overwrite')}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <strong className="block text-red-700 dark:text-red-400">Overwrite (Timpa)</strong>
                      <span className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ HATI-HATI! Hapus data lama (produk & transaksi), ganti dengan data backup
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Pilih File Backup (.json):</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full border dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                  disabled={isRestoring}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowRestoreDialog(false)}
                  variant="outline"
                  disabled={isRestoring}
                >
                  Batal
                </Button>
              </div>

              {isRestoring && (
                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  ⏳ Restoring... Mohon tunggu...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
