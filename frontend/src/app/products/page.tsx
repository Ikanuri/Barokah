'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Edit, Trash2, Package, FileSpreadsheet, Download, Upload } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import ProductFormModal, { Product } from '@/components/products/ProductFormModal';

const CACHE_KEY = 'products_cache';
const CACHE_DURATION = 5 * 60 * 1000;

interface CachedData {
  data: Product[];
  timestamp: number;
}

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [dataQualityFilter, setDataQualityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);

  useEffect(() => {
    fetchProducts();
    const handleProductUpdate = () => fetchProducts();
    window.addEventListener('productUpdated', handleProductUpdate);
    return () => window.removeEventListener('productUpdated', handleProductUpdate);
  }, []);

  useEffect(() => {
    let filtered = allProducts;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
      );
    }

    if (dataQualityFilter !== 'all') {
      filtered = filtered.filter(product => {
        switch (dataQualityFilter) {
          case 'no-barcode':
            return !product.barcode || product.barcode === '';
          case 'low-stock':
            return product.stock_quantity <= product.minimum_stock;
          case 'no-stock':
            return product.stock_quantity === 0;
          case 'incomplete':
            return !product.barcode || !product.description || product.stock_quantity === 0;
          default:
            return true;
        }
      });
    }
    
    setProducts(filtered);
    setCurrentPage(1);
  }, [search, allProducts, dataQualityFilter]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = products.slice(startIndex, endIndex);
    setDisplayedProducts(paginated);
  }, [products, currentPage, itemsPerPage]);

  const fetchProducts = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const cachedData: CachedData = JSON.parse(cached);
            const age = Date.now() - cachedData.timestamp;
            setAllProducts(cachedData.data);
            setProducts(cachedData.data);
            setLoading(false);
            if (age < CACHE_DURATION) {
              return;
            }
            fetchProductsFromAPI(false);
            return;
          } catch {
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }
      setLoading(true);
      await fetchProductsFromAPI(true);
    } catch {
      setLoading(false);
    }
  };

  const fetchProductsFromAPI = async (showLoading = true) => {
    try {
      const response = await api.get('/products', {
        params: { per_page: 10000, _t: Date.now() }
      });
      const productsData = response.data.data || [];
      const cacheData: CachedData = {
        data: productsData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setAllProducts(productsData);
      setProducts(productsData);
      
      if (productsData.length === 0 && showLoading) {
        toast('Belum ada produk. Tambahkan produk pertama Anda!', {
          icon: '📦',
          duration: 3000
        });
      }
    } catch (error: any) {
      if (showLoading) {
        toast.error(`Gagal memuat produk: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem('pos_products_cache');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Produk berhasil dihapus');
      clearCache();
      fetchProducts(true);
      window.dispatchEvent(new CustomEvent('productUpdated', {
        detail: { action: 'delete', productId: id }
      }));
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedProducts([]);
      setIsSelectAll(false);
    } else {
      const allIds = displayedProducts.map(p => p.id);
      setSelectedProducts(allIds);
      setIsSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedProducts.length} produk?`)) return;

    try {
      await Promise.all(selectedProducts.map(id => api.delete(`/products/${id}`)));
      toast.success(`${selectedProducts.length} produk berhasil dihapus`);
      setSelectedProducts([]);
      setIsSelectAll(false);
      clearCache();
      fetchProducts(true);
      window.dispatchEvent(new CustomEvent('productUpdated', {
        detail: { action: 'bulk_delete', count: selectedProducts.length }
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSaved = async () => {
    setShowModal(false);
    setEditingProduct(null);
    clearCache();
    await fetchProducts(true);
  };

  const handleExport = async () => {
    try {
      setShowExcelDropdown(false);
      toast.loading('Mengunduh data produk...', { duration: 1000 });
      
      const response = await api.get('/export/products', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Data produk berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh data produk');
    }
  };

  const handleExportJSON = async () => {
    try {
      setShowExcelDropdown(false);
      toast.loading('Mengunduh data JSON...', { duration: 1000 });
      const response = await api.get('/products');
      const products = response.data.data || response.data;
      const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Backup JSON berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh backup JSON');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setShowExcelDropdown(false);
      toast.loading('Mengunduh template...', { duration: 1000 });
      
      const response = await api.get('/export/template/products', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Template berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh template');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('File harus berformat CSV');
      return;
    }
    setSelectedFile(file);
    setShowImportModal(true);
    setShowExcelDropdown(false);
  };

  const confirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setShowImportModal(false);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', importMode);

    try {
      const response = await api.post('/import/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const successMsg = response.data.imported > 0
        ? `✅ Import selesai! ${response.data.imported} produk berhasil diimport`
        : '⚠️ Import selesai, tapi tidak ada produk yang diimport';
      if (response.data.imported > 0) {
        toast.success(successMsg, { duration: 4000 });
      } else {
        toast.error(successMsg, { duration: 4000 });
      }

      if (response.data.errors && response.data.errors.length > 0) {
        const skipped = response.data.errors.filter((e: string) => e.includes('SKIPPED')).length;
        const warnings = response.data.errors.length - skipped;
        let summaryMsg = '';
        if (skipped > 0 && warnings > 0) {
          summaryMsg = `⚠️ ${skipped} produk di-skip (duplicate barcode), ${warnings} warning lainnya`;
        } else if (skipped > 0) {
          summaryMsg = `⚠️ ${skipped} produk di-skip karena barcode duplicate`;
        } else {
          summaryMsg = `⚠️ ${warnings} warning`;
        }
        const errorSummary = response.data.errors.slice(0, 5).join('\n');
        const moreErrors = response.data.errors.length > 5
          ? `\n\n... dan ${response.data.errors.length - 5} lainnya`
          : '';
        toast.error(`${summaryMsg}\n\n${errorSummary}${moreErrors}`, { duration: 10000 });
      }

      clearCache();
      fetchProducts(true);
      window.dispatchEvent(new CustomEvent('productUpdated', {
        detail: { action: 'import', count: response.data.imported }
      }));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Gagal mengimport data';
      const validationErrors = error.response?.data?.errors;
      if (validationErrors) {
        const firstError = Object.values(validationErrors)[0] as string[];
        toast.error(`Validation Error: ${firstError[0]}`);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setImporting(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExcelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Produk</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Kelola daftar produk toko Anda
            </p>
          </div>
          <div className="flex gap-2">
            {/* Excel Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => setShowExcelDropdown(!showExcelDropdown)}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet size={20} className="text-green-600" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              
              {showExcelDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-2">
                    {/* Export CSV */}
                    <button
                      onClick={handleExport}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <Download size={16} className="text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Export CSV</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Unduh produk ke CSV</p>
                      </div>
                    </button>
                    
                    {/* Export JSON */}
                    <button
                      onClick={handleExportJSON}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <Download size={16} className="text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Backup JSON</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Backup lengkap dengan detail</p>
                      </div>
                    </button>
                    
                    {/* Import */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50 border-t border-gray-200 dark:border-gray-700"
                    >
                      <Upload size={16} className="text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {importing ? 'Importing...' : 'Import Data'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Upload file CSV produk</p>
                      </div>
                    </button>
                    
                    {/* Download Template */}
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
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
                onChange={handleImport}
                className="hidden"
              />
            </div>
            
            {/* Add Product Button */}
            <Button onClick={() => setShowModal(true)}>
              <Plus size={20} className="mr-2" />
              <span className="hidden sm:inline">Tambah Produk</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
            
            {/* Bulk Delete Button */}
            {selectedProducts.length > 0 && (
              <Button 
                onClick={handleBulkDelete}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
              >
                <Trash2 size={20} className="mr-2" />
                Hapus ({selectedProducts.length})
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Cari produk berdasarkan nama atau kode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" onClick={() => setSearch('')} variant="outline">
                <Search size={20} className="mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daftar Produk</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total: <span className="font-semibold text-telegram-blue dark:text-blue-400">{allProducts.length}</span> produk
                  {products.length !== allProducts.length && (
                    <span className="ml-2">
                      (Menampilkan: <span className="font-semibold">{products.length}</span>)
                    </span>
                  )}
                </p>
              </div>
              
              {/* Data Quality Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Filter:</label>
                <select
                  value={dataQualityFilter}
                  onChange={(e) => setDataQualityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-telegram-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Semua Produk</option>
                  <option value="no-barcode">Tanpa Barcode ({allProducts.filter(p => !p.barcode).length})</option>
                  <option value="low-stock">Stok Rendah ({allProducts.filter(p => p.stock_quantity <= p.minimum_stock).length})</option>
                  <option value="no-stock">Stok Habis ({allProducts.filter(p => p.stock_quantity === 0).length})</option>
                  <option value="incomplete">Data Tidak Lengkap ({allProducts.filter(p => !p.barcode || !p.description || p.stock_quantity === 0).length})</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-blue dark:border-blue-400"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Belum ada produk</p>
                <Button onClick={() => setShowModal(true)} className="mt-4">
                  Tambah Produk Pertama
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={isSelectAll && displayedProducts.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Kode</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nama</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Kategori</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Harga</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Stok</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{product.sku}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {product.category?.name || <span className="text-gray-400 italic">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrency(product.selling_price)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            product.stock_quantity <= product.minimum_stock
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          }`}>
                            {product.stock_quantity} {product.base_unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingProduct(product);
                                setShowModal(true);
                              }}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {products.length > 0 && (
                  <div className="mt-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, products.length)}</span> dari <span className="font-medium">{products.length}</span> produk
                      {search && <span className="ml-2 text-blue-600 dark:text-blue-400">(hasil pencarian)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        ← Sebelumnya
                      </Button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Hal. {currentPage} / {Math.ceil(products.length / itemsPerPage)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(products.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(products.length / itemsPerPage)}
                      >
                        Selanjutnya →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <ProductFormModal
          isOpen={showModal}
          editingProduct={editingProduct}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />

        {/* Import Mode Selection Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardContent>
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Pilih Mode Import</h2>
                
                {selectedFile && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-telegram">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>File:</strong> {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <label className="flex items-start p-4 border-2 rounded-telegram cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 has-[:checked]:border-telegram-blue dark:has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                    <input
                      type="radio"
                      name="importMode"
                      value="add"
                      checked={importMode === 'add'}
                      onChange={(e) => setImportMode(e.target.value as 'add' | 'overwrite')}
                      className="mt-1 mr-3 h-4 w-4 text-telegram-blue focus:ring-telegram-blue"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Tambah Data Baru</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Hanya menambahkan produk baru. Produk dengan barcode yang sama akan di-update, produk lama tetap aman.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 rounded-telegram cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 has-[:checked]:border-red-500 has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-900/20">
                    <input
                      type="radio"
                      name="importMode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={(e) => setImportMode(e.target.value as 'add' | 'overwrite')}
                      className="mt-1 mr-3 h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Timpa Data Existing</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <strong className="text-red-600 dark:text-red-400">⚠️ Hati-hati:</strong> Produk dengan barcode/SKU yang sama akan dihapus dulu, lalu diganti dengan data baru dari CSV.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmImport}
                    className={importMode === 'overwrite' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {importMode === 'add' ? '✅ Import (Tambah)' : '⚠️ Import (Timpa)'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
