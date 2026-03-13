'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { FileSpreadsheet, Download, Upload } from 'lucide-react';
import api from '@/lib/api';

interface ExportImportButtonsProps {
  entityType: 'products' | 'transactions' | 'users' | 'categories' | 'customers';
  onImportSuccess?: () => void;
  exportFilters?: Record<string, any>;
}

export function ExportImportButtons({ 
  entityType, 
  onImportSuccess,
  exportFilters = {}
}: ExportImportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const entityConfig = {
    products: {
      exportEndpoint: '/export/products',
      importEndpoint: '/import/products',
      templateEndpoint: '/export/template/products',
      label: 'Produk',
    },
    transactions: {
      exportEndpoint: '/export/transactions',
      importEndpoint: '/import/transactions',
      templateEndpoint: '/export/template/transactions',
      label: 'Transaksi',
    },
    users: {
      exportEndpoint: '/export/users',
      importEndpoint: '/import/users',
      templateEndpoint: '/export/template/users',
      label: 'User',
    },
    categories: {
      exportEndpoint: '/export/categories',
      importEndpoint: '/import/categories',
      templateEndpoint: '/export/template/categories',
      label: 'Kategori',
    },
    customers: {
      exportEndpoint: '/export/customers',
      importEndpoint: '/import/customers',
      templateEndpoint: '/export/template/customers',
      label: 'Customer',
    },
  };

  const config = entityConfig[entityType];

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setShowDropdown(false);

      const queryParams = new URLSearchParams(exportFilters as any).toString();
      const endpoint = `${config.exportEndpoint}${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get(endpoint, { responseType: 'blob' });
      downloadBlob(response.data, `${entityType}_${new Date().toISOString().split('T')[0]}.csv`);
      alert(`✅ Export ${config.label} berhasil!`);
    } catch {
      alert(`❌ Export ${config.label} gagal!`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setShowDropdown(false);
      const response = await api.get(config.templateEndpoint, { responseType: 'blob' });
      downloadBlob(response.data, `${entityType}_template.csv`);
      alert(`✅ Download template ${config.label} berhasil!`);
    } catch {
      alert(`❌ Download template ${config.label} gagal!`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('❌ File harus berformat CSV');
      return;
    }

    // Show import dialog with mode selection
    setShowDropdown(false);
    setShowImportDialog(true);
  };

  const confirmImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setShowImportDialog(false);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', importMode);

      const response = await api.post(config.importEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;

      let message = `✅ Import ${config.label} berhasil!\n\n`;
      message += `📊 Diimport: ${data.imported} data\n`;
      
      if (data.errors && data.errors.length > 0) {
        message += `\n⚠️ Errors (${data.errors.length}):\n`;
        message += data.errors.slice(0, 5).join('\n');
        if (data.errors.length > 5) {
          message += `\n... dan ${data.errors.length - 5} error lainnya`;
        }
      }
      
      alert(message);
      onImportSuccess?.();
    } catch (error: any) {
      alert(`❌ Import ${config.label} gagal!\n${error.response?.data?.message || error.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* Excel Dropdown Button */}
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2"
        >
          <FileSpreadsheet size={20} className="text-green-600" />
          <span className="hidden sm:inline">Excel</span>
        </Button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-2">
              {/* Export */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50"
              >
                <Download size={16} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Unduh semua {config.label.toLowerCase()} ke CSV
                  </p>
                </div>
              </button>
              
              {/* Import */}
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50"
              >
                <Upload size={16} className="text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload file CSV {config.label.toLowerCase()}
                  </p>
                </div>
              </button>
              
              {/* Download Template */}
              <button
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 border-t border-gray-200 dark:border-gray-700"
              >
                <FileSpreadsheet size={16} className="text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Download Template</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Template CSV kosong</p>
                </div>
              </button>
            </div>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Import Mode Selection Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowImportDialog(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Import {config.label}
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">
                Pilih Mode Import:
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="add"
                    checked={importMode === 'add'}
                    onChange={(e) => setImportMode(e.target.value as 'add')}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Tambah/Update</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Update data yang sudah ada, tambah data baru
                    </p>
                  </div>
                </label>
                <label className="flex items-start p-3 border border-red-300 dark:border-red-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={(e) => setImportMode(e.target.value as 'overwrite')}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Overwrite</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Hapus semua data lama, ganti dengan data baru
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Hati-hati! Data lama akan dihapus!
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowImportDialog(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                variant="secondary"
                disabled={isImporting}
              >
                Batal
              </Button>
              <Button
                onClick={confirmImport}
                disabled={isImporting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isImporting ? '⏳ Importing...' : 'Import Sekarang'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
