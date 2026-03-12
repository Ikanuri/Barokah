'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useCartStore } from '@/store/cart';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ThermalPrintPreview from '@/components/ThermalPrintPreview';
import PrinterSettings, { usePrinterConfig } from '@/components/PrinterSettings';
import { invalidateTransactionsCache, addPendingTransaction } from '@/lib/db';
import { isOnline } from '@/lib/sync';
import { broadcastSync } from '@/lib/broadcast';
import { parseSmartQuery, normalizeUnit } from '@/components/pos/helpers';
import ProductSearchBar from '@/components/pos/ProductSearchBar';
import ProductTable from '@/components/pos/ProductTable';
import CartBottomSheet from '@/components/pos/CartBottomSheet';
import VariantModal from '@/components/pos/VariantModal';
import EditProductModal from '@/components/pos/EditProductModal';

export default function POSPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [ignoreStock, setIgnoreStock] = useState(false);

  const [allProductsCache, setAllProductsCache] = useState<any[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const { config: printerConfig } = usePrinterConfig();

  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [transactionNotes, setTransactionNotes] = useState('');
  const [expandedItemNotes, setExpandedItemNotes] = useState<{ [key: string]: boolean }>({});
  const [showTransactionNotesInput, setShowTransactionNotesInput] = useState(false);

  const cart = useCartStore();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Load all products cache
  const loadProductsCache = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('pos_products_cache');
        if (cachedData) {
          const allProducts = JSON.parse(cachedData);
          setAllProductsCache(allProducts);
          setProducts(allProducts);
          setCacheLoaded(true);
          setLoading(false);
          return;
        }
      } else {
        sessionStorage.removeItem('pos_products_cache');
      }

      const response = await api.get('/products', { params: { per_page: 10000, is_active: 1 } });
      const allProducts = response.data.data || response.data || [];
      sessionStorage.setItem('pos_products_cache', JSON.stringify(allProducts));
      setAllProductsCache(allProducts);
      setProducts(allProducts);
      setCacheLoaded(true);
      setLoading(false);

      if (forceRefresh) {
        toast.success(`✅ Data produk diperbarui! (${allProducts.length} produk)`);
      }
    } catch (error) {
      setLoading(false);
      setCacheLoaded(true);
      toast.error('Gagal memuat data produk');
    }
  }, []);

  useEffect(() => {
    if (!cacheLoaded) loadProductsCache();
    fetchCustomers();
    const handleProductUpdate = () => loadProductsCache(true);
    window.addEventListener('productUpdated', handleProductUpdate);
    return () => window.removeEventListener('productUpdated', handleProductUpdate);
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 100 } });
      setCustomers(response.data.data || []);
      setFilteredCustomers(response.data.data || []);
    } catch (error) {}
  };

  const handleCustomerSearch = (searchTerm: string) => {
    setCustomerSearch(searchTerm);
    if (searchTerm.length === 0) {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(false);
      return;
    }
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
    setShowCustomerDropdown(true);
  };

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    cart.setSelectedCustomer(customer);
  };

  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearch('Umum');
    setFilteredCustomers(customers);
    cart.setSelectedCustomer(null);
  };

  // Search products with smart auto-add
  const handleSearch = async (query: string, autoAdd = false) => {
    setSearch(query);
    if (query.length < 2) {
      if (products.length !== allProductsCache.length) setProducts(allProductsCache);
      return;
    }

    const parsed = parseSmartQuery(query);
    setLoading(true);

    // FAST PATH: barcode lookup from cache
    const looksLikeBarcode = /^[a-zA-Z0-9]{5,}$/.test(query.trim());
    if (looksLikeBarcode && autoAdd && cacheLoaded) {
      const queryLower = query.toLowerCase();
      const exactMatch = allProductsCache.find((p: any) =>
        p.barcode?.toLowerCase() === queryLower || p.sku?.toLowerCase() === queryLower
      );
      if (exactMatch) {
        setLoading(false);
        setSearch('');
        cart.addItem(exactMatch, undefined, undefined);
        toast.success(`✅ ${exactMatch.name}`, { duration: 1000 });
        searchInputRef.current?.focus();
        return;
      }
      for (const product of allProductsCache) {
        if (product.variants && product.variants.length > 0) {
          const matchedVariant = product.variants.find((v: any) => v.barcode?.toLowerCase() === queryLower);
          if (matchedVariant) {
            setLoading(false);
            setSearch('');
            cart.addItem(product, undefined, matchedVariant);
            toast.success(`✅ ${product.name} (${matchedVariant.name})`, { duration: 1000 });
            searchInputRef.current?.focus();
            return;
          }
        }
      }
      setLoading(false);
      return;
    }

    // FILTER FROM CACHE
    const queryLower = parsed.productName.toLowerCase();
    const filteredProducts = allProductsCache.filter((p: any) =>
      p.name.toLowerCase().includes(queryLower) ||
      p.sku?.toLowerCase().includes(queryLower) ||
      p.barcode?.toLowerCase().includes(queryLower)
    );
    setProducts(filteredProducts);
    setLoading(false);

    // AUTO-ADD
    if (autoAdd && filteredProducts.length > 0) {
      const product = filteredProducts[0];

      if (product.matched_variant) {
        addToCartWithVariant(product, null, product.matched_variant, parsed.quantity);
        return;
      }

      let matchedVariant = null;
      if (product.variants && product.variants.length > 0) {
        matchedVariant = product.variants.find((v: any) =>
          v.barcode && v.barcode.toLowerCase() === query.toLowerCase()
        );
      }
      if (matchedVariant) {
        addToCartWithVariant(product, null, matchedVariant, parsed.quantity);
        return;
      }

      let targetUnit = null;
      if (parsed.unit) {
        const normalizedRequestedUnit = normalizeUnit(parsed.unit) || parsed.unit;
        const originalUnit = parsed.unit.toLowerCase();
        targetUnit = product.units?.find((u: any) => {
          const productUnitLower = u.unit_name.toLowerCase();
          return productUnitLower === normalizedRequestedUnit.toLowerCase() || productUnitLower === originalUnit;
        });
        if (!targetUnit) {
          const baseUnit = product.units?.find((u: any) =>
            u.unit_name.toLowerCase() === product.base_unit?.toLowerCase()
          );
          targetUnit = baseUnit || product.units?.[0];
          const commonUnits = ['biji', 'pcs', 'unit'];
          const isCommonUnit = commonUnits.includes(parsed.unit.toLowerCase());
          if (isCommonUnit && targetUnit) {
            toast(`ℹ️ ${product.name} dijual per ${targetUnit.unit_name}, bukan per ${parsed.unit}`, { duration: 2500, icon: 'ℹ️' });
          } else if (!isCommonUnit) {
            toast.error(`Unit "${parsed.unit}" tidak tersedia. Menggunakan ${targetUnit?.unit_name}.`, { duration: 2500 });
          }
        }
      } else {
        targetUnit = product.units?.find((u: any) =>
          u.unit_name.toLowerCase() === product.base_unit?.toLowerCase()
        ) || product.units?.[0];
      }

      for (let i = 0; i < parsed.quantity; i++) {
        cart.addItem(product, targetUnit);
      }

      const similarityInfo = product.similarity ? ` (kecocokan ${Math.round(product.similarity * 100)}%)` : '';
      toast.success(
        `✅ ${parsed.quantity} ${targetUnit?.unit_name || product.base_unit} ${product.name} ditambahkan${similarityInfo}`,
        { duration: 3000 }
      );
      setSearch('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const addToCart = (product: any, unit?: any, quantity: number = 1) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedUnit(unit);
      setSelectedQuantity(quantity);
      setShowVariantModal(true);
      return;
    }
    addToCartWithVariant(product, unit, null, quantity);
  };

  const addToCartWithVariant = (product: any, unit?: any, variant?: any, quantity: number = 1) => {
    cart.addItem(product, unit, variant, quantity);
    const unitName = unit?.unit_name || product.base_unit;
    const variantName = variant ? ` (${variant.name})` : '';
    const message = quantity > 1
      ? `${quantity} ${unitName} ${product.name}${variantName} ditambahkan ke keranjang`
      : `${product.name}${variantName} ditambahkan ke keranjang`;
    toast.success(message);
    setSearch('');
    setShowVariantModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Long press handlers
  const handleLongPressStart = (product: any) => {
    const timer = setTimeout(() => {
      setEditingProduct(product);
      setShowEditModal(true);
      toast.success('Edit mode produk dibuka!');
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const updateData = {
        name: editingProduct.name,
        sku: editingProduct.sku,
        barcode: editingProduct.barcode,
        selling_price: editingProduct.selling_price,
        stock_quantity: editingProduct.stock_quantity,
        base_unit: editingProduct.base_unit,
        description: editingProduct.description,
      };
      await api.put(`/products/${editingProduct.id}`, updateData);
      toast.success('Produk berhasil diupdate!');
      setShowEditModal(false);
      await loadProductsCache(true);
      window.dispatchEvent(new CustomEvent('productUpdated', { detail: { productId: editingProduct.id } }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal update produk');
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (cart.items.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    const total = cart.getTotal();
    const paidValue = parseFloat(paidAmount || '0');

    let autoPaymentStatus: 'paid' | 'unpaid' | 'partial';
    if (paidValue === 0) autoPaymentStatus = 'unpaid';
    else if (paidValue < total) autoPaymentStatus = 'partial';
    else autoPaymentStatus = 'paid';

    let finalGuestName = null;
    if (!selectedCustomer) {
      finalGuestName = customerSearch.trim() || 'Umum';
    }

    try {
      const items = cart.items.map(item => ({
        product_id: item.product.id,
        product_unit_id: item.productUnit?.id || null,
        variant_name: item.variant?.name || null,
        quantity: item.quantity,
        notes: item.notes || null,
      }));

      const transactionPayload = {
        items,
        customer_id: selectedCustomer?.id || null,
        guest_name: finalGuestName,
        payment_status: autoPaymentStatus,
        paid_amount: paidValue,
        payment_method: paymentMethod,
        ignore_stock: ignoreStock,
        notes: transactionNotes || null,
      };

      let transactionData;
      let isOfflineTransaction = false;

      if (!isOnline()) {
        const offlineId = await addPendingTransaction(transactionPayload);
        transactionData = {
          id: offlineId,
          transaction_code: `OFFLINE-${Date.now()}`,
          created_at: new Date().toISOString(),
          items: cart.items.map((item, idx) => ({
            id: idx,
            product: { name: item.product.name, sku: item.product.sku || '' },
            productUnit: item.productUnit,
            quantity: item.quantity,
            unit_price: item.productUnit?.selling_price || item.product.selling_price || 0,
            subtotal: (item.productUnit?.selling_price || item.product.selling_price || 0) * item.quantity,
            notes: item.notes,
          })),
          subtotal: total, discount: 0, tax: 0, total: total,
          paid_amount: paidValue, change_amount: paidValue - total, notes: transactionNotes,
        };
        isOfflineTransaction = true;
        toast.success('📵 Offline - Transaksi disimpan lokal. Akan dikirim saat online.', { duration: 5000 });
      } else {
        const response = await api.post('/transactions', transactionPayload);
        transactionData = response.data.data || response.data;
        if (autoPaymentStatus === 'paid') {
          toast.success('Transaksi berhasil! Pembayaran lunas.');
        } else if (autoPaymentStatus === 'unpaid') {
          toast('Transaksi tersimpan sebagai Belum Bayar. Customer dapat melunasi nanti.', { icon: '💡', duration: 4000 });
        } else if (autoPaymentStatus === 'partial') {
          const remaining = total - paidValue;
          toast(`Cicilan tersimpan. Sisa yang harus dibayar: ${formatCurrency(remaining)}`, { icon: '⚠️', duration: 4000 });
        }
      }

      const printData = {
        id: transactionData.id,
        invoice_number: transactionData.transaction_code,
        transaction_date: transactionData.created_at || new Date().toISOString(),
        items: transactionData.items.map((item: any) => ({
          product: { name: item.product?.name || 'Unknown Product', sku: item.product?.sku || '' },
          productUnit: item.productUnit ? { unit_name: item.productUnit.unit_name || item.product?.base_unit || 'pcs' } : undefined,
          quantity: item.quantity, unitPrice: item.unit_price, subtotal: item.subtotal, notes: item.notes,
        })),
        subtotal: transactionData.subtotal, discount: transactionData.discount || 0,
        tax: transactionData.tax || 0, total: transactionData.total,
        paid_amount: transactionData.paid_amount, change: transactionData.change_amount,
        payment_method: paymentMethod, payment_status: autoPaymentStatus,
        customer: selectedCustomer, guest_name: finalGuestName, notes: transactionData.notes,
      };

      setLastTransaction(printData);
      setShowPrintPreview(true);
      cart.clearCart();
      setIsCartExpanded(false);
      setPaidAmount('');
      setIgnoreStock(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentStatus('paid');
      setTransactionNotes('');
      setExpandedItemNotes({});
      setShowTransactionNotesInput(false);

      broadcastSync('transaction_created', { transaction: transactionData, offline: isOfflineTransaction });
      await invalidateTransactionsCache();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  // Voice search
  const startVoiceSearch = () => {
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecureContext && window.location.hostname !== '127.0.0.1') {
      toast.error('Voice command memerlukan HTTPS. Akses melalui https://... atau localhost', { duration: 5000 });
      const useHttps = confirm(
        '⚠️ MICROPHONE MEMERLUKAN HTTPS\n\nBrowser memblokir akses microphone di HTTP untuk keamanan.\n\nSolusi:\n1. Gunakan laptop/PC di localhost\n2. Setup HTTPS dengan ngrok atau cloudflare tunnel\n3. Gunakan keyboard untuk input manual\n\nKlik OK untuk info lebih lanjut.'
      );
      if (useHttps) window.open('https://ngrok.com/download', '_blank');
      return;
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Browser tidak mendukung voice search', { duration: 4000 });
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      if (recognition.hasOwnProperty('interimResults')) recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎤 Silakan bicara...', { duration: 5000, icon: '🎤' });
      };
      recognition.onresult = (event: any) => {
        setIsListening(false);
        let transcript = '';
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) { transcript = event.results[i][0].transcript; break; }
        }
        if (!transcript && event.results.length > 0) transcript = event.results[event.results.length - 1][0].transcript;
        handleSearch(transcript, true);
        toast.success(`🎤 "${transcript}"`, { duration: 2000 });
      };
      recognition.onerror = (event: any) => {
        setIsListening(false);
        let errorMessage = 'Gagal menangkap suara';
        switch(event.error) {
          case 'not-allowed': case 'permission-denied': errorMessage = '❌ Akses microphone ditolak. Izinkan akses microphone di pengaturan browser.'; break;
          case 'no-speech': errorMessage = 'Tidak ada suara terdeteksi. Coba lagi.'; break;
          case 'network': errorMessage = 'Koneksi internet bermasalah.'; break;
          case 'aborted': errorMessage = 'Voice search dibatalkan.'; break;
        }
        toast.error(errorMessage, { duration: 4000 });
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (error) {
      toast.error('Gagal memulai voice search. Coba gunakan pencarian manual.', { duration: 4000 });
    }
  };

  const total = cart.getTotal();

  // Pagination (memoized)
  const paginationData = useMemo(() => {
    const effectiveItemsPerPage = isMobile ? 5 : itemsPerPage;
    const indexOfLastItem = currentPage * effectiveItemsPerPage;
    const indexOfFirstItem = indexOfLastItem - effectiveItemsPerPage;
    const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(products.length / effectiveItemsPerPage);
    const displayedProductsMobile = isMobile && !isExpanded ? currentProducts.slice(0, 3) : currentProducts;
    const hasMoreToExpand = isMobile && currentProducts.length > 3;
    return { effectiveItemsPerPage, indexOfLastItem, indexOfFirstItem, currentProducts, totalPages, displayedProductsMobile, hasMoreToExpand };
  }, [products, currentPage, itemsPerPage, isMobile, isExpanded]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setIsExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="relative h-screen flex flex-col">
        <div className="flex-1 overflow-auto pb-32">
          <ProductSearchBar
            search={search}
            onSearchChange={handleSearch}
            onPageReset={() => setCurrentPage(1)}
            onVoiceSearch={startVoiceSearch}
            isListening={isListening}
            searchInputRef={searchInputRef}
          />
          <ProductTable
            products={products}
            currentProducts={paginationData.currentProducts}
            displayedProductsMobile={paginationData.displayedProductsMobile}
            hasMoreToExpand={paginationData.hasMoreToExpand}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            loading={loading}
            search={search}
            cartItems={cart.items}
            totalPages={paginationData.totalPages}
            currentPage={currentPage}
            indexOfFirstItem={paginationData.indexOfFirstItem}
            indexOfLastItem={paginationData.indexOfLastItem}
            effectiveItemsPerPage={paginationData.effectiveItemsPerPage}
            isMobile={isMobile}
            onRefresh={() => loadProductsCache(true)}
            onAddToCart={addToCart}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <CartBottomSheet
        cart={cart}
        isCartExpanded={isCartExpanded}
        setIsCartExpanded={setIsCartExpanded}
        total={total}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        ignoreStock={ignoreStock}
        setIgnoreStock={setIgnoreStock}
        transactionNotes={transactionNotes}
        setTransactionNotes={setTransactionNotes}
        expandedItemNotes={expandedItemNotes}
        setExpandedItemNotes={setExpandedItemNotes}
        showTransactionNotesInput={showTransactionNotesInput}
        setShowTransactionNotesInput={setShowTransactionNotesInput}
        customerSearch={customerSearch}
        onCustomerSearch={handleCustomerSearch}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={selectCustomer}
        onClearCustomer={clearCustomerSelection}
        showCustomerDropdown={showCustomerDropdown}
        filteredCustomers={filteredCustomers}
        onPayment={handlePayment}
        onShowPrinterSettings={() => setShowPrinterSettings(true)}
      />

      <VariantModal
        show={showVariantModal}
        product={selectedProduct}
        unit={selectedUnit}
        quantity={selectedQuantity}
        onSelect={addToCartWithVariant}
        onClose={() => setShowVariantModal(false)}
      />

      <EditProductModal
        show={showEditModal}
        product={editingProduct}
        onChange={setEditingProduct}
        onSave={handleSaveProduct}
        onClose={() => setShowEditModal(false)}
      />

      {showPrintPreview && lastTransaction && (
        <ThermalPrintPreview
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          transaction={lastTransaction}
          settings={printerConfig}
        />
      )}

      <PrinterSettings
        isOpen={showPrinterSettings}
        onClose={() => setShowPrinterSettings(false)}
      />
    </Layout>
  );
}
