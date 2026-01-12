'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import EditTransactionModal from '@/components/EditTransactionModal';
import { ExportImportButtons } from '@/components/ExportImportButtons';
import { Search, Eye, Download, Receipt, RefreshCw, Plus, Minus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { getCachedTransactions, setCachedTransactions, invalidateTransactionsCache } from '@/lib/db';
import { onSyncEvent, handleSyncEvent } from '@/lib/broadcast';

interface Transaction {
  id: number;
  invoice_number: string;
  date: string;
  total: number;
  payment_method: string;
  payment_status?: string;
  payment_amount: number;
  paid_total?: number;
  change: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  } | null;
  guest_name?: string | null;
  cashier: {
    name: string;
  };
  items_count: number;
  status?: string;
  items?: TransactionItem[];
}

interface TransactionItem {
  id: number;
  product_id?: number;
  product_unit_id?: number | null;
  product_name: string;
  unit_name?: string;
  variant_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false); // ✅ Start with false - will show loading only when fetching
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 🔍 NEW: Toggle Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState(''); // Single date picker
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [cashiers, setCashiers] = useState<any[]>([]);
  
  // Edit & Payment states
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Edit Items Modal states (old - will be replaced with inline edit)
  const [showEditItemsModal, setShowEditItemsModal] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  
  // Inline Edit Mode (NEW for detail modal)
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [tempItems, setTempItems] = useState<any[]>([]);
  const [tempPaymentAmount, setTempPaymentAmount] = useState('');
  const [ignoreStock, setIgnoreStock] = useState(false); // Override stock validation
  
  // Edit Payment Method state
  const [showEditPaymentMethodModal, setShowEditPaymentMethodModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // 🔧 FIX: Use useCallback with cache support like POS and products
  const fetchTransactions = useCallback(async (useCache = true) => {
    try {
      // 🔥 Try cache first (if no filters applied)
      const hasFilters = search || filterDate || filterCustomer || filterCashier || paymentStatusFilter;
      
      if (useCache && !hasFilters) {
        const cached = await getCachedTransactions();
        if (cached) {
          console.log('[TRANSACTIONS] Using cached data, fetching fresh in background...');
          setTransactions(cached.data);
          setTimeout(() => fetchTransactionsInBackground(), 100);
          return;
        }
      } else if (hasFilters) {
        console.log('[TRANSACTIONS] Filters applied, bypassing cache');
      }
      
      setLoading(true);
      console.log('🔄 [TRANSACTIONS] Fetching from API...');
      
      const response = await api.get('/transactions', {
        params: { 
          search,
          start_date: filterDate || undefined, // Use single date
          end_date: filterDate || undefined,   // Same date for exact match
          customer_id: filterCustomer || undefined,
          user_id: filterCashier || undefined,
          payment_status: paymentStatusFilter || undefined,
          per_page: 1000, // ✅ Tampilkan semua transaksi (max 1000)
        }
      });
      
      const transactionsData = response.data.data || [];
      setTransactions(transactionsData);
      
      // 🔥 Cache hasil jika tidak ada filter
      if (!hasFilters) {
        await setCachedTransactions(transactionsData);
      }
      
      console.log('✅ Loaded transactions:', transactionsData.length, 'items');
      console.log('📊 Payment status breakdown:', {
        total: transactionsData.length,
        unpaid: transactionsData.filter((t: Transaction) => t.payment_status === 'unpaid').length,
        partial: transactionsData.filter((t: Transaction) => t.payment_status === 'partial').length,
        paid: transactionsData.filter((t: Transaction) => t.payment_status === 'paid').length,
      });
    } catch (error: any) {
      console.error('❌ Error fetching transactions:', error);
      toast.error('Gagal memuat transaksi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [search, filterDate, filterCustomer, filterCashier, paymentStatusFilter]);

  // Background fetch - silent update without loading spinner
  const fetchTransactionsInBackground = useCallback(async () => {
    try {
      console.log('[TRANSACTIONS] Background fetch started...');
      const response = await api.get('/transactions', {
        params: { per_page: 1000 }
      });
      
      const transactionsData = response.data.data || [];
      await setCachedTransactions(transactionsData);
      setTransactions(transactionsData);
      console.log('[TRANSACTIONS] Background updated', transactionsData.length, 'items');
    } catch (error) {
      console.error('[TRANSACTIONS] Background fetch failed:', error);
    }
  }, []);

  // 🔧 FIX: Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchProducts(); // Load products for inline edit
    fetchCustomers(); // Load customers for filter
    fetchCashiers(); // Load cashiers for filter
  }, []);

  // 🔧 Auto-refresh when filters change
  useEffect(() => {
    fetchTransactions(); // Will use cache on first load (no filters)
  }, [fetchTransactions]);

  // 🔥 Real-time sync: Listen for broadcast events dari semua tabs
  useEffect(() => {
    console.log('🎧 [TRANSACTIONS] Setting up broadcast listeners');
    
    const unsubscribe = onSyncEvent(async (event) => {
      // Handle cache invalidation
      await handleSyncEvent(event);
      
      // Refresh data jika related ke transactions
      if (event.type.startsWith('transaction_') || event.type === 'sync_completed') {
        console.log('🔄 [TRANSACTIONS] Fetching fresh data after:', event.type);
        fetchTransactions(false); // Force fresh fetch, no loading spinner
      }
    });
    
    console.log('✅ [TRANSACTIONS] Broadcast listeners registered');

    return () => {
      console.log('🔌 [TRANSACTIONS] Removing broadcast listeners');
      unsubscribe();
    };
  }, [fetchTransactions]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 1000 } });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCashiers = async () => {
    try {
      const response = await api.get('/users', { params: { per_page: 100 } });
      setCashiers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleViewDetail = async (transaction: Transaction) => {
    try {
      console.log('Fetching transaction detail for ID:', transaction.id);
      const response = await api.get(`/transactions/${transaction.id}`);
      console.log('Transaction detail:', response.data);
      setSelectedTransaction(response.data.data || response.data);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('Error fetching transaction detail:', error);
      toast.error('Gagal memuat detail transaksi');
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTransaction(null);
    setIsEditMode(false);
  };

  const handleMakePayment = async () => {
    if (!selectedTransaction) return;
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Masukkan jumlah pembayaran');
      return;
    }

    try {
      await api.post(`/transactions/${selectedTransaction.id}/payment`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
      });

      toast.success('Pembayaran berhasil dicatat');
      setShowPaymentModal(false);
      setPaymentAmount('');
      
      // Refresh transaction detail
      const response = await api.get(`/transactions/${selectedTransaction.id}`);
      setSelectedTransaction(response.data.data || response.data);
      
      // Refresh list
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mencatat pembayaran');
    }
  };

  // Open Edit Items Modal
  const handleOpenEditItems = () => {
    if (!selectedTransaction?.items) return;
    
    // Convert transaction items to editable format
    const itemsForEdit = selectedTransaction.items.map((item, index) => ({
      id: item.id,
      product_id: item.product_id || null,
      product_unit_id: item.product_unit_id || null,
      product_name: item.product_name,
      unit_name: item.unit_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      tempId: `temp-${index}`, // For identifying items before save
    }));
    
    setEditItems(itemsForEdit);
    setShowEditItemsModal(true);
    fetchProducts(); // Load products for adding new items
  };

  // Toggle inline edit mode in detail modal
  const toggleInlineEditMode = () => {
    if (!selectedTransaction) return;
    
    if (!inlineEditMode) {
      // Entering edit mode - copy current items to temp
      const itemsForEdit = selectedTransaction.items?.map((item, index) => ({
        id: item.id,
        product_id: item.product_id || null,
        product_unit_id: item.product_unit_id || null,
        product_name: item.product_name,
        unit_name: item.unit_name,
        variant_name: item.variant_name,
        quantity: item.quantity,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'),
        subtotal: typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal || '0'),
        tempId: `temp-${index}`,
      })) || [];
      
      setTempItems(itemsForEdit);
      setTempPaymentAmount(selectedTransaction.paid_total?.toString() || '0');
      setInlineEditMode(true);
      fetchProducts(); // Load products for search
    } else {
      // Exiting edit mode - discard changes
      setInlineEditMode(false);
      setTempItems([]);
      setTempPaymentAmount('');
      setIgnoreStock(false); // Reset ignore stock
    }
  };

  // Update temp item quantity
  const updateTempItemQuantity = (tempId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setTempItems(items =>
      items.map(item =>
        item.tempId === tempId
          ? { ...item, quantity: newQuantity, subtotal: parseFloat(item.price) * newQuantity }
          : item
      )
    );
  };

  // Remove temp item
  const removeTempItem = (tempId: string) => {
    if (tempItems.length === 1) {
      toast.error('Transaksi harus memiliki minimal 1 item');
      return;
    }
    setTempItems(items => items.filter(item => item.tempId !== tempId));
  };

  // Add product to temp items
  const addProductToTemp = (product: any, unit: any = null) => {
    // Use selling_price from unit or product
    const priceRaw = unit ? (unit.selling_price || unit.price) : product.selling_price;
    const price = parseFloat(priceRaw || 0);
    const unitName = unit ? unit.unit_name : product.base_unit;
    
    const newItem = {
      id: null,
      product_id: product.id,
      product_name: product.name,
      unit_name: unitName,
      product_unit_id: unit?.id || null,
      variant_name: null,
      quantity: 1,
      price: price,
      subtotal: price,
      tempId: `new-${Date.now()}-${Math.random()}`,
    };
    
    setTempItems([...tempItems, newItem]);
    setSearchProduct('');
  };

  // Save inline edits
  const saveInlineEdits = async () => {
    if (!selectedTransaction) return;
    
    if (tempItems.length === 0) {
      toast.error('Transaksi harus memiliki minimal 1 item');
      return;
    }

    try {
      const itemsPayload = tempItems.map(item => ({
        product_id: item.product_id,
        product_unit_id: item.product_unit_id || null,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
      }));

      const totalTemp = tempItems.reduce((sum, item) => sum + item.subtotal, 0);
      const paidValue = parseFloat(tempPaymentAmount || '0');

      await api.put(`/transactions/${selectedTransaction.id}`, {
        items: itemsPayload,
        paid_amount: paidValue,
        ignore_stock: ignoreStock, // Override stock validation
      });

      toast.success('Transaksi berhasil diupdate');
      setInlineEditMode(false);
      setIgnoreStock(false); // Reset ignore stock
      
      // Refresh transaction detail
      const response = await api.get(`/transactions/${selectedTransaction.id}`);
      setSelectedTransaction(response.data.data || response.data);
      
      // Refresh list
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal update transaksi');
    }
  };

  // Fetch products for adding to transaction
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', {
        params: { per_page: 1000, is_active: 1 }
      });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Update item quantity in edit mode
  const updateEditItemQuantity = (tempId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setEditItems(items =>
      items.map(item =>
        item.tempId === tempId
          ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
          : item
      )
    );
  };

  // Remove item from edit list
  const removeEditItem = (tempId: string) => {
    setEditItems(items => items.filter(item => item.tempId !== tempId));
  };

  // Add product to edit items
  const addProductToEdit = (product: any, unit: any = null) => {
    const price = unit ? unit.price : product.price;
    const unitName = unit ? unit.unit_name : product.base_unit;
    
    const newItem = {
      id: null, // New item, no ID yet
      product_id: product.id,
      product_name: product.name,
      unit_name: unitName,
      product_unit_id: unit?.id || null,
      variant_name: null,
      quantity: 1,
      price: price,
      subtotal: price,
      tempId: `new-${Date.now()}-${Math.random()}`,
    };
    
    setEditItems([...editItems, newItem]);
    setSearchProduct(''); // Clear search
  };

  // Save edited items
  const handleSaveEditedItems = async () => {
    if (!selectedTransaction) return;
    
    if (editItems.length === 0) {
      toast.error('Transaksi harus memiliki minimal 1 item');
      return;
    }

    try {
      // Transform items to API format
      const itemsPayload = editItems.map(item => ({
        product_id: item.product_id,
        product_unit_id: item.product_unit_id || null,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
      }));

      await api.put(`/transactions/${selectedTransaction.id}`, {
        items: itemsPayload,
      });

      toast.success('Item transaksi berhasil diupdate');
      setShowEditItemsModal(false);
      
      // Refresh transaction detail
      const response = await api.get(`/transactions/${selectedTransaction.id}`);
      setSelectedTransaction(response.data.data || response.data);
      
      // Refresh list
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal update item transaksi');
    }
  };

  // Update payment method
  const handleUpdatePaymentMethod = async () => {
    if (!selectedTransaction || !newPaymentMethod) return;

    try {
      await api.patch(`/transactions/${selectedTransaction.id}/payment-method`, {
        payment_method: newPaymentMethod,
      });

      toast.success('Metode pembayaran berhasil diubah');
      setShowEditPaymentMethodModal(false);
      
      // Refresh transaction detail
      const response = await api.get(`/transactions/${selectedTransaction.id}`);
      setSelectedTransaction(response.data.data || response.data);
      
      // Refresh list
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal update metode pembayaran');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 📅 NEW: Format date for grouping (without time)
  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 📅 NEW: Group transactions by date
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {};
    
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    
    // Sort dates descending (newest first)
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        dateFormatted: formatDateOnly(date),
        transactions: grouped[date],
        totalAmount: grouped[date].reduce((sum, t) => sum + t.total, 0),
        count: grouped[date].length,
      }));
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: Record<string, { bg: string; darkBg: string; text: string; darkText: string; label: string }> = {
      cash: { bg: 'bg-green-100', darkBg: 'dark:bg-green-900/30', text: 'text-green-800', darkText: 'dark:text-green-400', label: 'TUNAI' },
      card: { bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/30', text: 'text-blue-800', darkText: 'dark:text-blue-400', label: 'KARTU' },
      transfer: { bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', text: 'text-purple-800', darkText: 'dark:text-purple-400', label: 'TRANSFER' },
      qris: { bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', text: 'text-orange-800', darkText: 'dark:text-orange-400', label: 'QRIS' },
    };
    const badge = badges[method] || badges.cash;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.darkBg} ${badge.text} ${badge.darkText}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Transaksi</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Riwayat transaksi penjualan • {transactions.length} transaksi
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => fetchTransactions(false)}
              disabled={loading}
            >
              <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ExportImportButtons 
              entityType="transactions"
              onImportSuccess={() => fetchTransactions(false)}
              exportFilters={{
                start_date: filterDate,
                end_date: filterDate,
              }}
            />
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            {/* Quick Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setPaymentStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === '' 
                    ? 'bg-telegram-blue dark:bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setPaymentStatusFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'unpaid' 
                    ? 'bg-red-600 dark:bg-red-700 text-white' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                }`}
              >
                🔴 Belum Lunas
              </button>
              <button
                onClick={() => setPaymentStatusFilter('partial')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'partial' 
                    ? 'bg-yellow-600 dark:bg-yellow-700 text-white' 
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                }`}
              >
                🟡 Cicilan
              </button>
              <button
                onClick={() => setPaymentStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  paymentStatusFilter === 'paid' 
                    ? 'bg-green-600 dark:bg-green-700 text-white' 
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                }`}
              >
                🟢 Lunas
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Cari nomor invoice..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit">
                  <Search size={20} className="mr-2" />
                  Cari
                </Button>
              </div>
              {/* 📅 NEW: Single Date Filter + Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                 
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                        className="flex-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setFilterDate(yesterday.toISOString().split('T')[0]);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Kemarin
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterDate('')}
                        className="flex-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👤 Pelanggan</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                  >
                    <option value="">Semua</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💼 Kasir</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={filterCashier}
                    onChange={(e) => setFilterCashier(e.target.value)}
                  >
                    <option value="">Semua</option>
                    {cashiers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daftar Transaksi</h2>
              {!loading && transactions.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {formatCurrency(transactions.reduce((sum, t) => sum + t.total, 0))}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-telegram-blue dark:border-blue-400"></div>
                <p className="mt-3 text-gray-600 dark:text-gray-400 font-medium">Memuat data transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Receipt size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-700 dark:text-gray-300 font-medium text-lg">Belum ada transaksi</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Transaksi yang dibuat akan muncul di sini</p>
              </div>
            ) : (
              /* 📅 GROUPED BY DATE */
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupTransactionsByDate(transactions).map((group) => (
                  <div key={group.date}>
                    {/* Date Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 md:px-6 py-3 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200">
                          📅 {group.dateFormatted}
                        </h3>
                        <div className="flex items-center gap-3 text-xs md:text-sm">
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded-full font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                            {group.count} transaksi
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full font-bold text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700">
                            {formatCurrency(group.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transactions for this date */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full">
                        <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                          <tr>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Pelanggan / Invoice
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">
                              Waktu
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden lg:table-cell">
                              Kasir
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Items
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Total
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">
                              Status Bayar
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden sm:table-cell">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                          {group.transactions.map((transaction) => (
                            <tr 
                              key={transaction.id} 
                              className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                              onClick={() => handleViewDetail(transaction)}
                            >
                              <td className="px-3 md:px-6 py-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {transaction.customer?.name || transaction.guest_name || 'Umum'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {transaction.invoice_number}
                                </div>
                                {/* Mobile: Show time here */}
                                <div className="text-xs text-gray-400 dark:text-gray-500 md:hidden mt-0.5">
                                  {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden md:table-cell">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden lg:table-cell">
                                <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                  {transaction.cashier.name}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                  {transaction.items_count}
                                </span>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(transaction.total)}
                                </div>
                                {transaction.payment_status === 'partial' && transaction.paid_total !== undefined && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Dibayar: {formatCurrency(transaction.paid_total)}
                                  </div>
                                )}
                                
                                {/* Mobile: Show kurang/kembalian badge */}
                                <div className="md:hidden mt-1">
                                  {(() => {
                                    const paidTotal = transaction.paid_total || 0;
                                    const total = transaction.total;
                                    const changeAmount = transaction.change || 0;
                                    
                                    // Jika ada kembalian (dari backend)
                                    if (changeAmount > 0) {
                                      return (
                                        <span className="inline-block text-xs font-semibold text-green-600 dark:text-green-400">
                                          Kembali: {formatCurrency(changeAmount)}
                                        </span>
                                      );
                                    } else if (transaction.payment_status === 'paid') {
                                      return (
                                        <span className="inline-block text-xs text-gray-500 dark:text-gray-400">
                                          Lunas ✓
                                        </span>
                                      );
                                    } else {
                                      const shortage = total - paidTotal;
                                      return (
                                        <span className="inline-block text-xs font-semibold text-red-600 dark:text-red-400">
                                          Kurang: {formatCurrency(shortage)}
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-3 text-right hidden md:table-cell">
                                {(() => {
                                  const paidTotal = transaction.paid_total || 0;
                                  const total = transaction.total;
                                  const changeAmount = transaction.change || 0;
                                  
                                  // Jika ada kembalian (dari backend)
                                  if (changeAmount > 0) {
                                    return (
                                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        Kembalian<br />
                                        {formatCurrency(changeAmount)}
                                      </div>
                                    );
                                  } else if (transaction.payment_status === 'paid') {
                                    // Lunas pas
                                    return (
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Lunas
                                      </div>
                                    );
                                  } else {
                                    // Belum lunas - tampilkan kekurangan (merah)
                                    const shortage = total - paidTotal;
                                    return (
                                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                        Kurang<br />
                                        {formatCurrency(shortage)}
                                      </div>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="px-3 md:px-6 py-3 hidden sm:table-cell">
                                <div className="space-y-1">
                                  {getPaymentMethodBadge(transaction.payment_method)}
                                  {transaction.payment_status === 'unpaid' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                      Belum Lunas
                                    </div>
                                  )}
                                  {transaction.payment_status === 'partial' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                                      Cicilan
                                    </div>
                                  )}
                                  {transaction.payment_status === 'paid' && (
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                      Lunas
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OLD DETAIL MODAL REMOVED - Now using EditTransactionModal component at the end of this file */}

      {/* Payment Modal */}
      {showPaymentModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800">
            <CardHeader>
              <h2 className="text-xl font-bold dark:text-gray-100">Catat Pembayaran</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedTransaction.invoice_number}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-bold dark:text-gray-100">{formatCurrency(selectedTransaction.total)}</span>
                </div>
                {selectedTransaction.paid_total !== undefined && selectedTransaction.paid_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sudah Dibayar</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(selectedTransaction.paid_total)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t dark:border-gray-600 pt-2">
                  <span className="text-gray-700 dark:text-gray-300">Sisa Hutang</span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatCurrency(selectedTransaction.total - (selectedTransaction.paid_total || 0))}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'card', 'transfer', 'qris'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2 rounded-lg border-2 text-sm font-medium ${
                        paymentMethod === method
                          ? 'border-telegram-blue dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-gray-100'
                          : 'border-gray-200 dark:border-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                  Jumlah Bayar <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="text-lg"
                />
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className="mt-2 space-y-1 text-sm">
                    {parseFloat(paymentAmount) >= (selectedTransaction.total - (selectedTransaction.paid_total || 0)) ? (
                      <>
                        <div className="text-green-600 dark:text-green-400 font-semibold">
                          ✓ Transaksi akan lunas
                        </div>
                        {parseFloat(paymentAmount) > (selectedTransaction.total - (selectedTransaction.paid_total || 0)) && (
                          <div className="text-gray-600 dark:text-gray-400">
                            Kembalian: {formatCurrency(parseFloat(paymentAmount) - (selectedTransaction.total - (selectedTransaction.paid_total || 0)))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-yellow-600 dark:text-yellow-400">
                        Sisa setelah bayar: {formatCurrency((selectedTransaction.total - (selectedTransaction.paid_total || 0)) - parseFloat(paymentAmount))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleMakePayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1"
                >
                  Catat Pembayaran
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Items Modal */}
      {showEditItemsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8 bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold dark:text-gray-100">Edit Items Transaksi</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedTransaction.invoice_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowEditItemsModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Items */}
              <div>
                <h3 className="font-semibold dark:text-gray-100 mb-2">Items Saat Ini</h3>
                <div className="border dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold dark:text-gray-300">Produk</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold dark:text-gray-300">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold dark:text-gray-300">Harga</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold dark:text-gray-300">Subtotal</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold dark:text-gray-300">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {editItems.map((item) => (
                        <tr key={item.tempId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm dark:text-gray-100">
                              {item.product_name}
                              {item.variant_name && (
                                <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                  {item.variant_name}
                                </span>
                              )}
                            </div>
                            {item.unit_name && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.unit_name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateEditItemQuantity(item.tempId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={12} />
                              </Button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value);
                                  if (newQty > 0) {
                                    updateEditItemQuantity(item.tempId, newQty);
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-14 text-center text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateEditItemQuantity(item.tempId, item.quantity + 1)}
                              >
                                <Plus size={12} />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm dark:text-gray-300">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-sm dark:text-gray-100">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => removeEditItem(item.tempId)}
                              disabled={editItems.length === 1}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 dark:border-gray-600">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-bold dark:text-gray-100">
                          Total Baru:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg text-telegram-blue dark:text-blue-400">
                          {formatCurrency(editItems.reduce((sum, item) => sum + item.subtotal, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Add Product */}
              <div className="pt-4 border-t dark:border-gray-600">
                <h3 className="font-semibold dark:text-gray-100 mb-2">Tambah Produk</h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Cari produk..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="flex-1"
                  />
                </div>
                
                {searchProduct.length >= 2 && (
                  <div className="border dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(searchProduct.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-600 last:border-b-0"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm dark:text-gray-100">{product.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Stock: {product.stock_quantity} {product.base_unit}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addProductToEdit(product)}
                              className="ml-2"
                            >
                              +1 {product.base_unit}
                            </Button>
                          </div>
                          
                          {/* Show units if available */}
                          {product.units && product.units.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2">
                              {product.units.map((unit: any) => (
                                <Button
                                  key={unit.id}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addProductToEdit(product, unit)}
                                  className="text-xs"
                                >
                                  +1 {unit.unit_name}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowEditItemsModal(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSaveEditedItems}
                  disabled={editItems.length === 0}
                  className="flex-1 bg-telegram-blue hover:bg-blue-600"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Payment Method Modal */}
      {showEditPaymentMethodModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-bold">Ubah Metode Pembayaran</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedTransaction.invoice_number}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Pilih Metode Pembayaran Baru
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'cash', label: '💵 Cash', color: 'green' },
                    { value: 'card', label: '💳 Card', color: 'blue' },
                    { value: 'transfer', label: '🏦 Transfer', color: 'purple' },
                    { value: 'qris', label: '📱 QRIS', color: 'orange' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setNewPaymentMethod(method.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        newPaymentMethod === method.value
                          ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-700`
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current vs New */}
              {newPaymentMethod !== selectedTransaction.payment_method && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Metode Sekarang:</span>
                    <span className="font-semibold">{selectedTransaction.payment_method.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-600">Akan Diubah Jadi:</span>
                    <span className="font-semibold text-blue-700">{newPaymentMethod.toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                ⚠️ <strong>Perhatian:</strong> Metode pembayaran hanya bisa diubah untuk transaksi yang belum lunas.
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditPaymentMethodModal(false);
                    setNewPaymentMethod('');
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleUpdatePaymentMethod}
                  disabled={!newPaymentMethod || newPaymentMethod === selectedTransaction.payment_method}
                  className="flex-1"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Modal Component */}
      {selectedTransaction && (
        <EditTransactionModal
          isOpen={showDetailModal}
          onClose={closeDetailModal}
          transaction={selectedTransaction}
          onUpdate={() => {
            fetchTransactions();
            closeDetailModal();
          }}
        />
      )}
    </Layout>
  );
}
