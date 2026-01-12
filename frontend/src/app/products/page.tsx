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
import ProductUnitsManager, { ProductUnit } from '@/components/ProductUnitsManager';
import ProductVariantsManager, { ProductVariant } from '@/components/ProductVariantsManager';
import ProductPricesManager, { ProductPrice } from '@/components/ProductPricesManager';

const CACHE_KEY = 'products_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: Product[];
  timestamp: number;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category: {
    id: number;
    name: string;
  };
  base_price?: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  description?: string;
  base_unit?: string;
  units?: ProductUnit[];
  variants?: ProductVariant[];
  prices?: ProductPrice[];
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Cache semua produk
  const [products, setProducts] = useState<Product[]>([]); // Filtered products untuk display
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]); // Paginated products
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [alternativePrices, setAlternativePrices] = useState<ProductPrice[]>([]);
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Data quality filter
  const [dataQualityFilter, setDataQualityFilter] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  
  // Bulk delete states
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category_id: '',
    base_price: '',
    selling_price: '',
    base_unit: 'biji',
    stock_quantity: '',
    minimum_stock: '5',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    
    // Listen for product updates from POS page
    const handleProductUpdate = () => {
      console.log('📢 Product update event received, refreshing...');
      fetchProducts();
    };
    
    window.addEventListener('productUpdated', handleProductUpdate);
    
    return () => {
      window.removeEventListener('productUpdated', handleProductUpdate);
    };
  }, []);

  // Auto-search dengan filter client-side (SUPER CEPAT!)
  useEffect(() => {
    let filtered = allProducts;
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter by data quality
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
    setCurrentPage(1); // Reset to page 1 when filtering
  }, [search, allProducts, dataQualityFilter]); // Trigger ketika search, allProducts, atau filter berubah

  // Paginate filtered products (render only current page)
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = products.slice(startIndex, endIndex);
    setDisplayedProducts(paginated);
    
    console.log(`📄 Showing page ${currentPage}: ${startIndex + 1}-${Math.min(endIndex, products.length)} of ${products.length} products`);
  }, [products, currentPage, itemsPerPage]);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        sku: editingProduct.sku,
        barcode: editingProduct.barcode || '',
        name: editingProduct.name,
        category_id: editingProduct.category?.id?.toString() || '', // Handle null category
        base_price: editingProduct.base_price?.toString() || '',
        selling_price: editingProduct.selling_price.toString(),
        base_unit: editingProduct.base_unit || 'biji',
        stock_quantity: editingProduct.stock_quantity.toString(),
        minimum_stock: editingProduct.minimum_stock.toString(),
        description: editingProduct.description || '',
        is_active: true
      });
      // Load units if product has units - ensure order is set
      const loadedUnits = (editingProduct.units || []).map((unit, index) => ({
        ...unit,
        order: unit.order || index + 1 // Fallback jika order tidak ada
      }));
      setUnits(loadedUnits);
      
      // Load variants if product has variants
      setVariants(editingProduct.variants || []);
      
      // Load prices if product has prices
      setAlternativePrices(editingProduct.prices || []);
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        category_id: '',
        base_price: '',
        selling_price: '',
        base_unit: 'biji',
        stock_quantity: '',
        minimum_stock: '5',
        description: '',
        is_active: true
      });
      setUnits([]); // Reset units for new product
      setVariants([]); // Reset variants for new product
      setAlternativePrices([]); // Reset prices for new product
    }
  }, [editingProduct]);

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories from API...');
      const response = await api.get('/categories');
      console.log('Categories API response:', response);
      
      const categoriesData = response.data.data || response.data || [];
      console.log('Categories loaded:', categoriesData.length, 'items');
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response);
      toast.error(`Gagal memuat kategori: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchProducts = async (forceRefresh = false) => {
    try {
      // INSTANT LOAD: Tampilkan cache dulu (jika ada)
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const cachedData: CachedData = JSON.parse(cached);
            const age = Date.now() - cachedData.timestamp;
            
            // Tampilkan cache LANGSUNG tanpa loading
            console.log('⚡ INSTANT: Displaying cached products', { 
              count: cachedData.data.length,
              age: Math.round(age / 1000) + 's'
            });
            setAllProducts(cachedData.data);
            setProducts(cachedData.data);
            setLoading(false);
            
            // Jika cache masih fresh, SELESAI (no API call)
            if (age < CACHE_DURATION) {
              console.log('✅ Cache still fresh, skipping API call');
              return;
            }
            
            // Jika cache expired, refresh di background (tanpa loading state)
            console.log('🔄 Cache expired, refreshing in background...');
            fetchProductsFromAPI(false); // Background refresh
            return;
          } catch (e) {
            console.warn('Invalid cache data, fetching fresh:', e);
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }
      
      // No cache: Show loading dan fetch
      setLoading(true);
      await fetchProductsFromAPI(true);
    } catch (error: any) {
      console.error('Error in fetchProducts:', error);
      setLoading(false);
    }
  };

  // Fetch dari API (bisa dengan atau tanpa loading state)
  const fetchProductsFromAPI = async (showLoading = true) => {
    try {
      if (showLoading) {
        console.log('🔄 Fetching products from API...');
      }
      
      const response = await api.get('/products', {
        params: { 
          per_page: 10000,
          _t: Date.now()
        }
      });
      
      const productsData = response.data.data || [];
      console.log('✅ Products loaded:', productsData.length, 'items');
      
      // Simpan ke localStorage cache
      const cacheData: CachedData = {
        data: productsData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Saved to cache');
      
      setAllProducts(productsData);
      setProducts(productsData);
      
      if (productsData.length === 0 && showLoading) {
        toast('Belum ada produk. Tambahkan produk pertama Anda!', {
          icon: '📦',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('Error fetching from API:', error);
      if (showLoading) {
        toast.error(`Gagal memuat produk: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Helper: Clear cache (dipanggil setelah create/update/delete)
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem('pos_products_cache'); // ✅ Clear POS cache also!
    console.log('🗑️ Cache cleared (Products + POS)');
  };

  const handleAddQuickCategory = async (categoryName: string) => {
    try {
      const response = await api.post('/categories', {
        name: categoryName,
        description: ''
      });
      
      toast.success(`Kategori "${categoryName}" berhasil ditambahkan!`);
      
      // Reload categories
      await fetchCategories();
      
      // Auto-select new category
      const newCategory = response.data.data;
      setFormData({ ...formData, category_id: newCategory.id.toString() });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menambah kategori');
      console.error('Error adding category:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Produk berhasil dihapus');
      clearCache(); // Clear cache sebelum fetch
      fetchProducts(true); // Force refresh
      
      // Dispatch event to notify POS page
      window.dispatchEvent(new CustomEvent('productUpdated', { 
        detail: { action: 'delete', productId: id } 
      }));
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  // Toggle select product
  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  // Select all products on current page
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

  // Bulk delete selected products
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    const confirmMsg = `Apakah Anda yakin ingin menghapus ${selectedProducts.length} produk?`;
    if (!confirm(confirmMsg)) return;

    try {
      // Delete all selected products
      const deletePromises = selectedProducts.map(id => api.delete(`/products/${id}`));
      await Promise.all(deletePromises);
      
      toast.success(`${selectedProducts.length} produk berhasil dihapus`);
      setSelectedProducts([]);
      setIsSelectAll(false);
      clearCache();
      fetchProducts(true);
      
      // Dispatch event to notify POS page
      window.dispatchEvent(new CustomEvent('productUpdated', { 
        detail: { action: 'bulk_delete', count: selectedProducts.length } 
      }));
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        sku: formData.sku,
        barcode: formData.barcode || null,
        name: formData.name,
        category_id: formData.category_id ? parseInt(formData.category_id) : null, // Allow null
        base_price: parseFloat(formData.base_price) || parseFloat(formData.selling_price),
        selling_price: parseFloat(formData.selling_price),
        base_unit: formData.base_unit,
        stock_quantity: parseInt(formData.stock_quantity),
        minimum_stock: parseInt(formData.minimum_stock),
        description: formData.description,
        is_active: formData.is_active,
        units: units,
        variants: variants.length > 0 ? variants : null, // Add variants
        prices: alternativePrices.length > 0 ? alternativePrices : null // Add prices
      };

      console.log('Submitting product data:', data);
      console.log('Units being sent:', units);
      console.log('Variants being sent:', variants);
      console.log('Prices being sent:', alternativePrices);
      console.log('Base price being sent:', formData.base_price);

      let response;
      if (editingProduct) {
        response = await api.put(`/products/${editingProduct.id}`, data);
        console.log('Update response:', response.data);
        toast.success('Produk berhasil diperbarui');
      } else {
        response = await api.post('/products', data);
        console.log('Create response:', response.data);
        toast.success('Produk berhasil ditambahkan');
      }

      setShowModal(false);
      setEditingProduct(null);
      setUnits([]); // Reset units
      setVariants([]); // Reset variants
      setAlternativePrices([]); // Reset prices
      
      // Clear cache dan force refresh
      clearCache();
      await fetchProducts(true); // Force refresh dari API
      
      // Dispatch event to notify POS page
      window.dispatchEvent(new CustomEvent('productUpdated', { 
        detail: { action: editingProduct ? 'update' : 'create' } 
      }));
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan produk');
      console.error('Error response:', error.response?.data);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  // Handle export to CSV
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
    } catch (error: any) {
      toast.error('Gagal mengunduh data produk');
      console.error('Export error:', error);
    }
  };

  // Handle export to JSON
  const handleExportJSON = async () => {
    try {
      setShowExcelDropdown(false);
      toast.loading('Mengunduh data JSON...', { duration: 1000 });
      
      // Fetch all products with full details
      const response = await api.get('/products');
      const products = response.data.data || response.data;
      
      // Create JSON blob
      const jsonStr = JSON.stringify(products, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Backup JSON berhasil diunduh');
    } catch (error: any) {
      toast.error('Gagal mengunduh backup JSON');
      console.error('Export JSON error:', error);
    }
  };

  // Handle download template
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
    } catch (error: any) {
      toast.error('Gagal mengunduh template');
      console.error('Template error:', error);
    }
  };

  // Handle import from CSV - Show modal for mode selection
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('File harus berformat CSV');
      return;
    }

    // Store file and show modal
    setSelectedFile(file);
    setShowImportModal(true);
    setShowExcelDropdown(false);
  };

  // Confirm import with selected mode
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

      // Show success message
      const successMsg = response.data.imported > 0 
        ? `✅ Import selesai! ${response.data.imported} produk berhasil diimport`
        : '⚠️ Import selesai, tapi tidak ada produk yang diimport';
      
      if (response.data.imported > 0) {
        toast.success(successMsg, { duration: 4000 });
      } else {
        toast.error(successMsg, { duration: 4000 });
      }

      // Show errors/warnings if any
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
        
        // Count SKIPPED vs WARNING
        const skipped = response.data.errors.filter((e: string) => e.includes('SKIPPED')).length;
        const warnings = response.data.errors.length - skipped;
        
        // Show summary
        let summaryMsg = '';
        if (skipped > 0 && warnings > 0) {
          summaryMsg = `⚠️ ${skipped} produk di-skip (duplicate barcode), ${warnings} warning lainnya`;
        } else if (skipped > 0) {
          summaryMsg = `⚠️ ${skipped} produk di-skip karena barcode duplicate`;
        } else {
          summaryMsg = `⚠️ ${warnings} warning`;
        }
        
        // Show first 5 errors in detail
        const errorSummary = response.data.errors.slice(0, 5).join('\n');
        const moreErrors = response.data.errors.length > 5 
          ? `\n\n... dan ${response.data.errors.length - 5} lainnya (lihat console)`
          : '';
        
        toast.error(
          `${summaryMsg}\n\n${errorSummary}${moreErrors}`,
          { duration: 10000 }
        );
      }

      clearCache(); // Clear cache setelah import
      fetchProducts(true); // Force refresh
      
      // Dispatch event to notify POS page
      window.dispatchEvent(new CustomEvent('productUpdated', { 
        detail: { action: 'import', count: response.data.imported } 
      }));
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Gagal mengimport data';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors) {
        // Show validation errors
        const firstError = Object.values(validationErrors)[0] as string[];
        toast.error(`Validation Error: ${firstError[0]}`);
      } else {
        toast.error(errorMsg);
      }
      
      console.error('Import error:', error);
    } finally {
      setImporting(false);
      setSelectedFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Close dropdown when clicking outside
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

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-3xl my-8">
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Kode/SKU Produk"
                      placeholder="PRD001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                    <Input
                      label="Barcode (Opsional)"
                      placeholder="8998866200011"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Nama Produk"
                    placeholder="Nama produk"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kategori <span className="text-gray-500 text-xs">(Opsional)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      >
                        <option value="">Tanpa Kategori</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const categoryName = prompt('Nama kategori baru:');
                          if (categoryName) {
                            handleAddQuickCategory(categoryName);
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1"
                        title="Tambah kategori baru"
                      >
                        <span className="text-lg">+</span>
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Klik tombol <span className="font-semibold">+</span> untuk menambah kategori baru dengan cepat
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Harga Pokok (HPP)"
                        type="number"
                        step="0.01"
                        placeholder="8000"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Opsional. Harga modal/beli untuk menghitung laba.
                      </p>
                    </div>
                    <div>
                      <Input
                        label="Harga Jual"
                        type="number"
                        step="0.01"
                        placeholder="10000"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        required
                      />
                      {formData.base_price && formData.selling_price && (
                        (() => {
                          const basePrice = parseFloat(formData.base_price) || 0;
                          const sellingPrice = parseFloat(formData.selling_price) || 0;
                          const profit = sellingPrice - basePrice;
                          const margin = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : 0;
                          return (
                            <p className={`mt-1 text-xs font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              Laba: {formatCurrency(profit)} ({margin}%)
                            </p>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Stok Awal"
                      type="number"
                      placeholder="100"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      required
                    />
                    <Input
                      label="Min. Stok Alert"
                      type="number"
                      placeholder="5"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Deskripsi (Opsional)
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      rows={3}
                      placeholder="Deskripsi produk"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Product Units Manager */}
                  <ProductUnitsManager
                    units={units}
                    onUnitsChange={setUnits}
                    basePrice={parseFloat(formData.selling_price) || 0}
                    baseUnit={formData.base_unit || 'biji'}
                  />

                  {/* Product Variants Manager */}
                  <ProductVariantsManager
                    variants={variants}
                    onChange={setVariants}
                    basePrice={parseFloat(formData.selling_price) || 0}
                  />

                  {/* Product Alternative Prices Manager */}
                  <ProductPricesManager
                    prices={alternativePrices}
                    onPricesChange={setAlternativePrices}
                    basePrice={parseFloat(formData.selling_price) || 0}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Menyimpan...' : editingProduct ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            </div>
          </div>
        )}

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
