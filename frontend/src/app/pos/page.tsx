'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore } from '@/store/cart';
import { formatCurrency } from '@/lib/utils';
import { Search, Barcode, Mic, Trash2, Plus, Minus, Printer, Settings, ShoppingCart, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ThermalPrintPreview from '@/components/ThermalPrintPreview';
import PrinterSettings, { usePrinterConfig } from '@/components/PrinterSettings';
import { invalidateTransactionsCache, addPendingTransaction } from '@/lib/db';
import { isOnline } from '@/lib/sync';
import { broadcastSync } from '@/lib/broadcast';

// Helper function to format number with thousand separator
const formatNumberInput = (value: string): string => {
  // Remove non-digit characters
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  // Add thousand separator
  return parseInt(numericValue).toLocaleString('id-ID');
};

// Helper function to parse formatted number back to string
const parseFormattedNumber = (value: string): string => {
  return value.replace(/\./g, '');
};

export default function POSPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [ignoreStock, setIgnoreStock] = useState(false); // NEW: Opsi ignore stock
  
  // Debug: Track products state changes
  useEffect(() => {
    console.log(`🔄 [PRODUCTS STATE] Changed, length: ${products.length}`);
  }, [products]);
  
  // CACHE: All products for instant barcode lookup
  const [allProductsCache, setAllProductsCache] = useState<any[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  
  // Pagination for product list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Desktop: 20, Mobile will use 5 via calculation
  
  // Detect mobile for smaller pagination
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile expand state for showing more products (3 -> 5)
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Customer & Payment Status
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  
  // Customer search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  
  // Variant selection
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  // Edit product modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Long press state
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Print modal states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const { config: printerConfig } = usePrinterConfig();
  
  // Expandable cart bottom sheet
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  
  // Transaction notes
  const [transactionNotes, setTransactionNotes] = useState('');
  
  // Item notes expandable state
  const [expandedItemNotes, setExpandedItemNotes] = useState<{ [key: string]: boolean }>({});
  
  // Transaction notes expandable state
  const [showTransactionNotesInput, setShowTransactionNotesInput] = useState(false);
  
  const cart = useCartStore();
  const searchInputRef = React.useRef<HTMLInputElement>(null); // Ref for search input
  
  // Debug: Track products state changes
  useEffect(() => {
    console.time('⏱️ [RENDER] Products list re-render');
    console.log(`🔄 [PRODUCTS STATE] Changed, length: ${products.length}`);
    
    return () => {
      console.timeEnd('⏱️ [RENDER] Products list re-render');
    };
  }, [products]);
  
  // Debug: Track cart changes  
  useEffect(() => {
    console.log(`🛒 [CART UPDATE] Items count: ${cart.items.length}`);
  }, [cart.items.length]);

  // Load all products cache for instant barcode lookup
  const loadProductsCache = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      // 1. Check sessionStorage first (INSTANT!) - unless force refresh
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('pos_products_cache');
        if (cachedData) {
          const allProducts = JSON.parse(cachedData);
          setAllProductsCache(allProducts);
          setProducts(allProducts);
          setCacheLoaded(true);
          setLoading(false);
          console.log(`⚡ [POS CACHE] Loaded ${allProducts.length} products from sessionStorage (INSTANT!)`);
          return; // ✅ NO API CALL!
        }
      } else {
        console.log('🔄 [POS CACHE] Force refresh - clearing cache...');
        sessionStorage.removeItem('pos_products_cache');
      }

      // 2. If no cache or force refresh, load from API
      console.log('🔄 [POS INIT] Loading all products from API...');
      const response = await api.get('/products', {
        params: { 
          per_page: 10000,
          is_active: 1 
        }
      });
      const allProducts = response.data.data || response.data || [];
      
      // 3. Save to sessionStorage for next time
      sessionStorage.setItem('pos_products_cache', JSON.stringify(allProducts));
      
      setAllProductsCache(allProducts);
      setProducts(allProducts);
      setCacheLoaded(true);
      setLoading(false);
      console.log(`✅ [POS CACHE] Loaded ${allProducts.length} products from API & saved to sessionStorage`);
      
      if (forceRefresh) {
        toast.success(`✅ Data produk diperbarui! (${allProducts.length} produk)`);
      }
    } catch (error) {
      console.error('❌ [POS CACHE] Error loading products:', error);
      setLoading(false);
      setCacheLoaded(true);
      toast.error('Gagal memuat data produk');
    }
  }, []);

  useEffect(() => {
    // Only load if cache is empty
    if (!cacheLoaded) {
      loadProductsCache();
    }
    
    fetchCustomers();
    
    // Listen for product updates from Products page
    const handleProductUpdate = () => {
      console.log('📢 Product update event received in POS, refreshing cache...');
      loadProductsCache(true);
    };
    
    window.addEventListener('productUpdated', handleProductUpdate);
    
    return () => {
      window.removeEventListener('productUpdated', handleProductUpdate);
    };
  }, []); // Empty deps = run ONCE only, never reload!

  // Load customers
  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { per_page: 100 } });
      setCustomers(response.data.data || []);
      setFilteredCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Filter customers based on search
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

  // Select customer from dropdown
  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    
    // Update cart store to apply customer tier pricing
    cart.setSelectedCustomer(customer);
  };

  // Clear customer selection
  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearch('Umum'); // Set default to "Umum" instead of empty
    setFilteredCustomers(customers);
    
    // Clear customer from cart store
    cart.setSelectedCustomer(null);
  };

  // Normalize Indonesian number words to digits
  const normalizeNumbers = (text: string): string => {
    const numberMap: { [key: string]: string } = {
      'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4',
      'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9',
      'sepuluh': '10', 'sebelas': '11', 'duabelas': '12', 'tigabelas': '13',
      'empatbelas': '14', 'limabelas': '15', 'enambelas': '16', 'tujuhbelas': '17',
      'delapanbelas': '18', 'sembilanbelas': '19', 'duapuluh': '20',
      'tigapuluh': '30', 'empatpuluh': '40', 'limapuluh': '50',
      'seratus': '100', 'seribu': '1000'
    };
    
    let normalized = text.toLowerCase();
    for (const [word, digit] of Object.entries(numberMap)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, digit);
    }
    return normalized;
  };

  // Normalize unit synonyms to standard units
  const normalizeUnit = (unit: string | null): string | null => {
    if (!unit) return null;
    
    const unitMap: { [key: string]: string } = {
      'kardus': 'dus', 'karton': 'dus', 'box': 'dus',
      'btl': 'botol', 'bottle': 'botol',
      'pc': 'pcs', 'piece': 'pcs', 'pieces': 'pcs',
      'bh': 'biji', 'buah': 'biji',
      'paket': 'pak', 'package': 'pak',
      'can': 'kaleng', 'tin': 'kaleng'
    };
    
    const lowerUnit = unit.toLowerCase();
    return unitMap[lowerUnit] || lowerUnit;
  };

  // Calculate string similarity using Levenshtein distance
  const stringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1 : 1 - (costs[s2.length] / maxLength);
  };

  // Parse smart query: "mie sedap 5 biji" -> product: "mie sedap", qty: 5, unit: "biji"
  const parseSmartQuery = (query: string) => {
    // Step 1: Normalize number words to digits (lima → 5, sepuluh → 10)
    const normalizedQuery = normalizeNumbers(query.trim());
    
    // Regex untuk menangkap: [product name] [angka] [unit]
    // Contoh: "mie sedap 5 biji", "indomie 10 dus", "coca cola 2 pak"
    const patterns = [
      // Pattern: "nama produk angka unit" (e.g., "mie sedap 5 biji")
      /^(.+?)\s+(\d+)\s+([a-zA-Z]+)$/i,
      // Pattern: "angka unit nama produk" (e.g., "5 biji mie sedap")
      /^(\d+)\s+([a-zA-Z]+)\s+(.+)$/i,
      // Pattern: "nama produk angka" (default ke unit terkecil)
      /^(.+?)\s+(\d+)$/i,
    ];

    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        if (pattern.source.includes('\\s+([a-zA-Z]+)\\s+(.+)$')) {
          // Pattern 2: "angka unit nama produk" (e.g., "5 biji mie sedap")
          return {
            productName: match[3].trim(),
            quantity: parseInt(match[1]),
            unit: normalizeUnit(match[2]), // Normalize unit synonyms
          };
        } else if (pattern.source.includes('\\s+([a-zA-Z]+)$')) {
          // Pattern 1: "nama produk angka unit" (e.g., "mie sedap 5 biji")
          const rawUnit = match[3];
          const normalized = normalizeUnit(rawUnit);
          return {
            productName: match[1].trim(),
            quantity: parseInt(match[2]),
            unit: normalized || rawUnit.toLowerCase(), // Keep original if no synonym found
          };
        } else {
          // Pattern 3: "nama produk angka" (no unit specified)
          return {
            productName: match[1].trim(),
            quantity: parseInt(match[2]),
            unit: null, // akan pakai unit terkecil
          };
        }
      }
    }

    // Tidak ada pattern yang cocok, return query as-is
    return {
      productName: normalizedQuery.trim(),
      quantity: 1,
      unit: null,
    };
  };

  // Search products with smart auto-add
  const handleSearch = async (query: string, autoAdd = false) => {
    setSearch(query);
    
    // Reset to show all products if query is empty or too short
    if (query.length < 2) {
      // Only reset if products is currently filtered (not all products)
      if (products.length !== allProductsCache.length) {
        setProducts(allProductsCache); // Show all products
      }
      return;
    }

    // Parse smart query
    const parsed = parseSmartQuery(query);
    console.log('Parsed query:', parsed);

    setLoading(true);
    
    // FAST PATH: Jika input terlihat seperti barcode (angka/huruf 5+ karakter tanpa spasi)
    // Langsung cari by barcode dari CACHE, skip API call!
    const looksLikeBarcode = /^[a-zA-Z0-9]{5,}$/.test(query.trim());
    
    if (looksLikeBarcode && autoAdd && cacheLoaded) {
      console.log('🚀 INSTANT BARCODE LOOKUP FROM CACHE:', query);
      const queryLower = query.toLowerCase();
      
      // Cari exact match barcode/SKU dari CACHE - ZERO API CALL!
      const exactMatch = allProductsCache.find((p: any) => 
        p.barcode?.toLowerCase() === queryLower ||
        p.sku?.toLowerCase() === queryLower
      );
      
      if (exactMatch) {
        console.log('✅ BARCODE FOUND IN CACHE:', exactMatch.name);
        
        // INSTANT ADD - NO API, NO DELAY!
        console.time('⏱️ [ADD_TO_CART] cart.addItem');
        setLoading(false);
        setSearch(''); // Clear search immediately
        // DON'T reset products - keep current view!
        // setProducts(allProductsCache); // ❌ This triggers re-render of 7894 items!
        
        // Langsung add ke cart
        cart.addItem(exactMatch, undefined, undefined);
        console.timeEnd('⏱️ [ADD_TO_CART] cart.addItem');
        
        toast.success(`✅ ${exactMatch.name}`, { duration: 1000 });
        
        // Focus input untuk scan berikutnya
        searchInputRef.current?.focus();
        return; // EXIT - skip semua proses lain!
      }
      
      // Cek variant barcode dari CACHE
      for (const product of allProductsCache) {
        if (product.variants && product.variants.length > 0) {
          const matchedVariant = product.variants.find((v: any) => 
            v.barcode?.toLowerCase() === queryLower
          );
          
          if (matchedVariant) {
            console.log('✅ VARIANT BARCODE FOUND IN CACHE:', matchedVariant.name);
            
            // INSTANT ADD - NO API, NO DELAY!
            setLoading(false);
            setSearch(''); // Clear search immediately
            // DON'T reset products - keep current view!
            
            // Langsung add ke cart dengan variant
            cart.addItem(product, undefined, matchedVariant);
            toast.success(`✅ ${product.name} (${matchedVariant.name})`, { duration: 1000 });
            
            // Focus input untuk scan berikutnya
            searchInputRef.current?.focus();
            return; // EXIT - skip semua proses lain!
          }
        }
      }
      
      console.log('⚠️ Barcode tidak ketemu di cache');
      setLoading(false);
      return;
    }
    
    // FILTER FROM CACHE instead of API call
    const queryLower = parsed.productName.toLowerCase();
    const filteredProducts = allProductsCache.filter((p: any) => 
      p.name.toLowerCase().includes(queryLower) ||
      p.sku?.toLowerCase().includes(queryLower) ||
      p.barcode?.toLowerCase().includes(queryLower)
    );
    
    setProducts(filteredProducts);
    setLoading(false);

    // AUTO-ADD: Jika filtered hanya 1 produk dan user press Enter
    if (autoAdd && filteredProducts.length > 0) {
      const product = filteredProducts[0];
        
        // Check if backend matched a variant barcode
        if (product.matched_variant) {
          console.log('Variant barcode matched by backend:', product.matched_variant.name);
          addToCartWithVariant(product, null, product.matched_variant, parsed.quantity);
          return;
        }
        
        // Check if scanned barcode matches a variant (fallback client-side check)
        let matchedVariant = null;
        if (product.variants && product.variants.length > 0) {
          matchedVariant = product.variants.find((v: any) => 
            v.barcode && v.barcode.toLowerCase() === query.toLowerCase()
          );
        }
        
        if (matchedVariant) {
          // Found variant barcode match - add directly
          console.log('Variant barcode matched client-side:', matchedVariant.name);
          addToCartWithVariant(product, null, matchedVariant, parsed.quantity);
          return;
        }
        
        console.log('Selected product:', product.name);
        console.log('Product units:', product.units);
        console.log('Product units names:', product.units?.map((u: any) => u.unit_name));
        console.log('Requested unit:', parsed.unit);
        
        // Cari unit yang diminta (dengan normalisasi)
        let targetUnit = null;
        if (parsed.unit) {
          // Normalisasi unit yang diminta user
          const normalizedRequestedUnit = normalizeUnit(parsed.unit) || parsed.unit;
          const originalUnit = parsed.unit.toLowerCase();
          console.log('Normalized unit:', normalizedRequestedUnit);
          console.log('Original unit:', originalUnit);
          
          // Cari di product units - cek direct match ATAU normalized match
          targetUnit = product.units?.find((u: any) => {
            const productUnitLower = u.unit_name.toLowerCase();
            const requestedUnitLower = normalizedRequestedUnit.toLowerCase();
            
            console.log(`  Comparing: "${productUnitLower}" vs "${requestedUnitLower}" (normalized) or "${originalUnit}" (original)`);
            
            // Direct match
            if (productUnitLower === requestedUnitLower) {
              console.log(`  ✅ Match found (normalized): ${u.unit_name}`);
              return true;
            }
            
            // Check if the product unit matches original input
            if (productUnitLower === originalUnit) {
              console.log(`  ✅ Match found (original): ${u.unit_name}`);
              return true;
            }
            
            return false;
          });
          
          console.log('Matched unit:', targetUnit?.unit_name || 'NOT FOUND');
          
          // Jika unit tidak ketemu, gunakan fallback strategy
          if (!targetUnit) {
            // Strategy 1: Coba cari base unit
            const baseUnit = product.units?.find((u: any) => 
              u.unit_name.toLowerCase() === product.base_unit?.toLowerCase()
            );
            
            // Strategy 2: Jika base unit juga tidak ada, pakai unit pertama (biasanya unit terkecil)
            targetUnit = baseUnit || product.units?.[0];
            
            console.log('Fallback unit:', targetUnit?.unit_name);
            
            // Hanya kasih warning jika unit yang diminta BUKAN unit umum
            const commonUnits = ['biji', 'pcs', 'unit'];
            const isCommonUnit = commonUnits.includes(parsed.unit.toLowerCase());
            
            if (isCommonUnit && targetUnit) {
              // Jika user minta "biji" tapi produk pakai "dus", kasih info saja (bukan error)
              toast(`ℹ️ ${product.name} dijual per ${targetUnit.unit_name}, bukan per ${parsed.unit}`, {
                duration: 2500,
                icon: 'ℹ️'
              });
            } else if (!isCommonUnit) {
              // Jika user minta unit aneh yang memang tidak ada, kasih warning
              toast.error(
                `Unit "${parsed.unit}" tidak tersedia. Menggunakan ${targetUnit?.unit_name}.`,
                { duration: 2500 }
              );
            }
          }
        } else {
          // Jika tidak ada unit yang diminta, pakai base unit
          targetUnit = product.units?.find((u: any) => 
            u.unit_name.toLowerCase() === product.base_unit?.toLowerCase()
          ) || product.units?.[0];
        }

        // Add ke cart dengan quantity yang diminta
        for (let i = 0; i < parsed.quantity; i++) {
          cart.addItem(product, targetUnit);
        }

        // Show success message with similarity info if fuzzy matched
        const similarityInfo = product.similarity 
          ? ` (kecocokan ${Math.round(product.similarity * 100)}%)`
          : '';
        
        toast.success(
          `✅ ${parsed.quantity} ${targetUnit?.unit_name || product.base_unit} ${product.name} ditambahkan${similarityInfo}`,
          { duration: 3000 }
        );

        // Clear search setelah add
        setSearch('');
        // DON'T reset products - keep current view for better UX!
        // Auto-focus search input for next entry
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
  };

  // Manual refresh function (optional - untuk tombol refresh jika diperlukan)
  const refreshProductsCache = async () => {
    setLoading(true);
    try {
      console.log('🔄 Manually refreshing products cache...');
      const response = await api.get('/products', {
        params: { 
          per_page: 10000,
          is_active: 1 
        }
      });
      const allProducts = response.data.data || response.data || [];
      setAllProductsCache(allProducts);
      setProducts(allProducts);
      setCacheLoaded(true);
      setLoading(false);
      console.log(`✅ Refreshed ${allProducts.length} products`);
    } catch (error) {
      console.error('Error refreshing products cache:', error);
      setLoading(false);
    }
  };
  
  // Note: visibilitychange listener REMOVED - cache is permanent until page reload
  // This prevents unnecessary API calls when switching tabs

  // Add product to cart
  const addToCart = (product: any, unit?: any, quantity: number = 1) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // Show variant selection modal
      setSelectedProduct(product);
      setSelectedUnit(unit);
      setSelectedQuantity(quantity);
      setShowVariantModal(true);
      return;
    }
    
    // No variants, add directly
    addToCartWithVariant(product, unit, null, quantity);
  };

  // Add product to cart with selected variant
  const addToCartWithVariant = (product: any, unit?: any, variant?: any, quantity: number = 1) => {
    // Add with quantity parameter to allow cart store to merge items properly
    cart.addItem(product, unit, variant, quantity);
    
    const unitName = unit?.unit_name || product.base_unit;
    const variantName = variant ? ` (${variant.name})` : '';
    const message = quantity > 1 
      ? `${quantity} ${unitName} ${product.name}${variantName} ditambahkan ke keranjang`
      : `${product.name}${variantName} ditambahkan ke keranjang`;
    
    toast.success(message);
    
    // Clear search field after adding product
    setSearch('');
    // DON'T clear products! Keep current view!
    // setProducts([]); // ❌ BUG! This empties product list!
    setShowVariantModal(false);
    
    // Auto-focus search input for next entry
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Long press handlers for edit product
  const handleLongPressStart = (product: any) => {
    const timer = setTimeout(() => {
      setEditingProduct(product);
      setShowEditModal(true);
      toast.success('Edit mode produk dibuka!');
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Save edited product
  const handleSaveProduct = async () => {
    try {
      // Prepare data without units (we only edit basic info)
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
      
      // Refresh product list in POS
      await loadProductsCache(true);
      
      // Dispatch custom event to notify other tabs/components
      window.dispatchEvent(new CustomEvent('productUpdated', { 
        detail: { productId: editingProduct.id } 
      }));
      
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
    
    // Auto-detect payment status based on paid amount
    let autoPaymentStatus: 'paid' | 'unpaid' | 'partial';
    if (paidValue === 0) {
      autoPaymentStatus = 'unpaid';
    } else if (paidValue < total) {
      autoPaymentStatus = 'partial';
    } else {
      autoPaymentStatus = 'paid';
    }

    // Auto-fill "Umum" if customer field is empty for ALL transaction types
    let finalGuestName = null;
    if (!selectedCustomer) {
      // No customer selected from dropdown
      if (customerSearch.trim()) {
        // User typed a name - use it as guest name
        finalGuestName = customerSearch.trim();
      } else {
        // Empty field - auto-fill "Umum" for all payment types
        finalGuestName = 'Umum';
      }
    }

    // Removed confirmation popup - langsung proses saja!

    try {
      const items = cart.items.map(item => ({
        product_id: item.product.id,
        product_unit_id: item.productUnit?.id || null,
        variant_name: item.variant?.name || null,
        quantity: item.quantity,
        notes: item.notes || null, // Include item notes
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

      // 📡 Check if online or offline
      if (!isOnline()) {
        // 📵 OFFLINE MODE - Save to IndexedDB
        console.log('📵 [POS] Offline mode - saving transaction locally');
        
        // Generate offline transaction data
        const offlineId = await addPendingTransaction(transactionPayload);
        
        transactionData = {
          id: offlineId,
          transaction_code: `OFFLINE-${Date.now()}`,
          created_at: new Date().toISOString(),
          items: cart.items.map((item, idx) => ({
            id: idx,
            product: {
              name: item.product.name,
              sku: item.product.sku || '',
            },
            productUnit: item.productUnit,
            quantity: item.quantity,
            unit_price: item.productUnit?.selling_price || item.product.selling_price || 0,
            subtotal: (item.productUnit?.selling_price || item.product.selling_price || 0) * item.quantity,
            notes: item.notes,
          })),
          subtotal: total,
          discount: 0,
          tax: 0,
          total: total,
          paid_amount: paidValue,
          change_amount: paidValue - total,
          notes: transactionNotes,
        };
        
        isOfflineTransaction = true;
        
        toast.success('📵 Offline - Transaksi disimpan lokal. Akan dikirim saat online.', {
          duration: 5000,
        });
      } else {
        // 🌐 ONLINE MODE - Send to server
        const response = await api.post('/transactions', transactionPayload);
        transactionData = response.data.data || response.data;

        // Show status-specific toast notifications
        if (autoPaymentStatus === 'paid') {
          toast.success('Transaksi berhasil! Pembayaran lunas.');
        } else if (autoPaymentStatus === 'unpaid') {
          toast('Transaksi tersimpan sebagai Belum Bayar. Customer dapat melunasi nanti.', {
            icon: '💡',
            duration: 4000,
          });
        } else if (autoPaymentStatus === 'partial') {
          const remaining = total - paidValue;
          toast(`Cicilan tersimpan. Sisa yang harus dibayar: ${formatCurrency(remaining)}`, {
            icon: '⚠️',
            duration: 4000,
          });
        }
      }
      
      // Format data for thermal print
      const printData = {
        id: transactionData.id,
        invoice_number: transactionData.transaction_code,
        transaction_date: transactionData.created_at || new Date().toISOString(),
        items: transactionData.items.map((item: any) => ({
          product: {
            name: item.product?.name || 'Unknown Product',
            sku: item.product?.sku || '',
          },
          productUnit: item.productUnit ? {
            unit_name: item.productUnit.unit_name || item.product?.base_unit || 'pcs'
          } : undefined,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
          notes: item.notes, // ✅ Include item notes
        })),
        subtotal: transactionData.subtotal,
        discount: transactionData.discount || 0,
        tax: transactionData.tax || 0,
        total: transactionData.total,
        paid_amount: transactionData.paid_amount,
        change: transactionData.change_amount,
        payment_method: paymentMethod,
        payment_status: autoPaymentStatus,
        customer: selectedCustomer,
        guest_name: finalGuestName,
        notes: transactionData.notes, // ✅ Include transaction notes
      };
      
      console.log('📄 Print data prepared:', printData);
      
      setLastTransaction(printData);
      setShowPrintPreview(true);
      
      cart.clearCart();
      setPaidAmount('');
      setIgnoreStock(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentStatus('paid');
      setTransactionNotes('');
      setExpandedItemNotes({});
      setShowTransactionNotesInput(false);
      
      // 🔥 Broadcast ke semua tabs untuk real-time sync
      broadcastSync(isOfflineTransaction ? 'transaction_created' : 'transaction_created', {
        transaction: transactionData,
        offline: isOfflineTransaction
      });
      console.log('📢 [POS] Broadcasted transaction_created event');
      
      // 🗑️ Invalidate cache
      await invalidateTransactionsCache();
      console.log('🗑️ [POS] Cleared transactions cache after checkout');
      
      // Don't auto-redirect, let user close print preview first
      // setTimeout(() => {
      //   router.push('/transactions');
      // }, 1000);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  // Voice search (Web Speech API)
  const startVoiceSearch = () => {
    // Check if HTTPS is required
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    
    if (!isSecureContext && window.location.hostname !== '127.0.0.1') {
      toast.error('Voice command memerlukan HTTPS. Akses melalui https://... atau localhost', {
        duration: 5000,
      });
      
      // Show instruction modal
      const useHttps = confirm(
        '⚠️ MICROPHONE MEMERLUKAN HTTPS\n\n' +
        'Browser memblokir akses microphone di HTTP untuk keamanan.\n\n' +
        'Solusi:\n' +
        '1. Gunakan laptop/PC di localhost\n' +
        '2. Setup HTTPS dengan ngrok atau cloudflare tunnel\n' +
        '3. Gunakan keyboard untuk input manual\n\n' +
        'Klik OK untuk info lebih lanjut.'
      );
      
      if (useHttps) {
        window.open('https://ngrok.com/download', '_blank');
      }
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Browser tidak mendukung voice search', {
        duration: 4000,
      });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Increase timeout to avoid cutting off speech
      if (recognition.hasOwnProperty('interimResults')) {
        recognition.interimResults = true; // Get interim results to detect early speech
      }

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎤 Silakan bicara...', {
          duration: 5000, // Increase duration
          icon: '🎤',
        });
      };

      recognition.onresult = (event: any) => {
        setIsListening(false);
        
        // Get final transcript (prioritize final over interim)
        let transcript = '';
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) {
            transcript = event.results[i][0].transcript;
            break;
          }
        }
        
        // Fallback to last result if no final found
        if (!transcript && event.results.length > 0) {
          transcript = event.results[event.results.length - 1][0].transcript;
        }
        
        // Log untuk debugging
        console.log('Voice input:', transcript);
        
        // Auto-add ke cart dari voice command
        handleSearch(transcript, true); // true = auto-add mode
        
        toast.success(`🎤 "${transcript}"`, {
          duration: 2000,
        });
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Gagal menangkap suara';
        switch(event.error) {
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = '❌ Akses microphone ditolak. Izinkan akses microphone di pengaturan browser.';
            break;
          case 'no-speech':
            errorMessage = 'Tidak ada suara terdeteksi. Coba lagi.';
            break;
          case 'network':
            errorMessage = 'Koneksi internet bermasalah.';
            break;
          case 'aborted':
            errorMessage = 'Voice search dibatalkan.';
            break;
        }
        
        toast.error(errorMessage, {
          duration: 4000,
        });
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting voice search:', error);
      toast.error('Gagal memulai voice search. Coba gunakan pencarian manual.', {
        duration: 4000,
      });
    }
  };

  const total = cart.getTotal();
  const change = paidAmount ? parseFloat(paidAmount) - total : 0;

  // Calculate pagination - responsive items per page (MEMOIZED for performance)
  const paginationData = useMemo(() => {
    console.log(`📊 [PAGINATION START] products.length: ${products.length}, currentPage: ${currentPage}, isMobile: ${isMobile}`);
    
    const effectiveItemsPerPage = isMobile ? 5 : itemsPerPage; // Mobile: 5, Desktop: 20
    const indexOfLastItem = currentPage * effectiveItemsPerPage;
    const indexOfFirstItem = indexOfLastItem - effectiveItemsPerPage;
    const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(products.length / effectiveItemsPerPage);
    
    console.log(`📊 [PAGINATION CALC] indexOfFirstItem: ${indexOfFirstItem}, indexOfLastItem: ${indexOfLastItem}, currentProducts: ${currentProducts.length}`);
    
    // For mobile: show 3 by default, 5 when expanded
    const displayedProductsMobile = isMobile && !isExpanded 
      ? currentProducts.slice(0, 3) 
      : currentProducts;
    const hasMoreToExpand = isMobile && currentProducts.length > 3;
    
    console.log(`📊 [PAGINATION RESULT] Page ${currentPage}/${totalPages}, displayedProductsMobile: ${displayedProductsMobile.length}, hasMoreToExpand: ${hasMoreToExpand}`);
    
    return {
      effectiveItemsPerPage,
      indexOfLastItem,
      indexOfFirstItem,
      currentProducts,
      totalPages,
      displayedProductsMobile,
      hasMoreToExpand
    };
  }, [products, currentPage, itemsPerPage, isMobile, isExpanded]);
  
  // Destructure for cleaner code
  const {
    effectiveItemsPerPage,
    indexOfLastItem,
    indexOfFirstItem,
    currentProducts,
    totalPages,
    displayedProductsMobile,
    hasMoreToExpand
  } = paginationData;

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setIsExpanded(false); // Reset expand state when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="relative h-screen flex flex-col">
        {/* Main Content - Product List (Full Width) */}
        <div className="flex-1 overflow-auto pb-32"> {/* Extra padding for bottom sheet */}
          <Card>
            <CardHeader>
              <h2 className="text-lg md:text-xl font-bold dark:text-gray-100">Cari Produk</h2>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    ref={searchInputRef}
                    placeholder="Cari produk atau scan barcode"
                    value={search}
                    onChange={(e) => {
                      handleSearch(e.target.value, false);
                      setCurrentPage(1); // Reset to page 1 on search
                    }}
                    onKeyDown={(e) => {
                      // INSTANT SUBMIT on Enter (no delay!)
                      if (e.key === 'Enter' && search.trim()) {
                        e.preventDefault(); // Prevent form submission
                        handleSearch(search, true); // Auto-add langsung!
                      }
                    }}
                    className="text-sm md:text-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={startVoiceSearch}
                  title="Voice Search"
                  className={`flex-shrink-0 ${isListening ? 'animate-pulse bg-red-100 border-red-500' : ''}`}
                  disabled={isListening}
                >
                  <Mic size={20} className={isListening ? 'text-red-600' : ''} />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {/* Implement barcode scanner */}}
                  title="Scan Barcode"
                  className="flex-shrink-0"
                >
                  <Barcode size={20} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold dark:text-gray-100">Daftar Produk</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {products.length} produk{search ? ' ditemukan' : ' tersedia'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {loading && <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadProductsCache(true)}
                    disabled={loading}
                    title="Refresh data produk dari server"
                    className="text-xs"
                  >
                    🔄 Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 px-2 dark:text-gray-300">Produk</th>
                      <th className="text-right py-2 px-2 dark:text-gray-300">Harga</th>
                      <th className="text-center py-2 px-2 dark:text-gray-300">Stok</th>
                      <th className="text-right py-2 px-2 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          {search ? 'Produk tidak ditemukan' : 'Tidak ada produk'}
                        </td>
                      </tr>
                    ) : (
                      <>
                        {displayedProductsMobile.map((product: any, index: number) => {
                          // Add animation class for expanded items
                          const isExpandedItem = isMobile && index >= 3 && isExpanded;
                          const animationClass = isExpandedItem 
                            ? 'animate-slideDown' 
                            : '';
                          
                          return (
                            <tr 
                              key={product.id} 
                              className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer select-none ${animationClass}`}
                              onMouseDown={() => handleLongPressStart(product)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => handleLongPressStart(product)}
                              onTouchEnd={handleLongPressEnd}
                              style={{
                                animation: isExpandedItem ? 'slideDown 0.3s ease-out' : 'none'
                              }}
                            >
                              <td className="py-3 px-2">
                                <div>
                                  <div className="font-medium dark:text-gray-200">
                                    {product.name}
                                    {/* Show all cart variants/units for this product */}
                                    {(() => {
                                      const cartItems = cart.items.filter(item => item.product.id === product.id);
                                      if (cartItems.length > 0) {
                                        return (
                                          <span className="ml-2 inline-flex items-center gap-1">
                                            {cartItems.map((item, idx) => (
                                              <span 
                                                key={`${item.product.id}-${item.productUnit?.id || 'base'}-${idx}`}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 animate-pulse"
                                              >
                                                🛒 {item.quantity} {item.productUnit?.unit_name || item.product.base_unit}
                                              </span>
                                            ))}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  {product.sku && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="font-semibold text-telegram-blue dark:text-blue-400">
                                  {formatCurrency(product.selling_price)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">/ {product.base_unit}</div>
                                {/* Show price tiers indicator with tooltip */}
                                {product.prices && product.prices.length > 0 && (
                                  <div className="relative group">
                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5 cursor-help">
                                      💰 {product.prices.length} tier harga
                                    </div>
                                    {/* Tooltip with all price tiers */}
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-lg z-50 w-48">
                                      <div className="font-semibold mb-1">Harga Tersedia:</div>
                                      {product.prices
                                        .filter((p: any) => p.is_active)
                                        .sort((a: any, b: any) => a.min_quantity - b.min_quantity)
                                        .map((price: any, idx: number) => (
                                          <div key={idx} className="flex justify-between py-0.5">
                                            <span>{price.price_name}:</span>
                                            <span className="font-semibold">{formatCurrency(price.price)}</span>
                                          </div>
                                        ))}
                                      <div className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-700 dark:border-gray-600">
                                        Harga otomatis berubah di keranjang
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`text-sm ${product.stock_quantity < 10 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {product.stock_quantity}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1 justify-end flex-wrap">
                                  {/* +1 Base Unit (biji) */}
                                  <Button
                                    size="sm"
                                    className="text-xs px-2 py-1 h-7"
                                    onClick={() => {
                                      // Find "biji" unit or use null for base unit
                                      const bijiUnit = product.units?.find((u: any) => u.unit_name.toLowerCase() === 'biji');
                                      addToCart(product, bijiUnit || null);
                                    }}
                                  >
                                    +1
                                  </Button>
                                  
                                  {/* +5 Base Unit (biji) */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-7"
                                    onClick={() => {
                                      // Find "biji" unit or use null for base unit
                                      const bijiUnit = product.units?.find((u: any) => u.unit_name.toLowerCase() === 'biji');
                                      addToCart(product, bijiUnit || null, 5);
                                    }}
                                  >
                                    +5
                                  </Button>
                                  
                                  {/* Unit buttons - exclude "biji" since we have +1 and +5 */}
                                  {product.units
                                    ?.filter((unit: any) => unit.unit_name.toLowerCase() !== 'biji')
                                    .slice(0, 2)
                                    .map((unit: any) => (
                                    <Button
                                      key={unit.id}
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-7"
                                      onClick={() => addToCart(product, unit)}
                                      title={`${formatCurrency(unit.selling_price || unit.price)} / ${unit.unit_name}`}
                                    >
                                      {unit.unit_name}
                                    </Button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Expand/Collapse Button - Mobile Only */}
                        {hasMoreToExpand && (
                          <tr className="transition-all duration-300">
                            <td colSpan={4} className="p-0">
                              <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full py-3 text-center text-xs font-medium text-telegram-blue dark:text-blue-400 hover:bg-telegram-blue/5 dark:hover:bg-blue-900/20 active:bg-telegram-blue/10 dark:active:bg-blue-900/30 border-b dark:border-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                  ▼
                                </span>
                                <span>
                                  {isExpanded 
                                    ? 'Tampilkan lebih sedikit' 
                                    : `Lihat ${currentProducts.length - 3} produk lagi`
                                  }
                                </span>
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-4 border-t dark:border-gray-700 gap-2">
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Hal {currentPage}/{totalPages}</span>
                    <span className="hidden md:inline ml-2">
                      (Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, products.length)} dari {products.length})
                    </span>
                    {isMobile && (
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                        📱 Tampilkan 3 produk (max {effectiveItemsPerPage}/hal)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="text-xs px-2 md:px-3"
                    >
                      ← {isMobile ? '' : 'Prev'}
                    </Button>
                    
                    {/* Page numbers - show fewer on mobile */}
                    {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                      let pageNum;
                      const maxPages = isMobile ? 3 : 5;
                      if (totalPages <= maxPages) {
                        pageNum = i + 1;
                      } else if (currentPage <= Math.ceil(maxPages / 2)) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                        pageNum = totalPages - maxPages + 1 + i;
                      } else {
                        pageNum = currentPage - Math.floor(maxPages / 2) + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={currentPage === pageNum ? 'primary' : 'outline'}
                          onClick={() => handlePageChange(pageNum)}
                          className="min-w-[32px] md:min-w-[36px] text-xs px-2"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="text-xs px-2 md:px-3"
                    >
                      {isMobile ? '' : 'Next'} →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expandable Bottom Sheet - Cart & Checkout */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-2xl border-t-2 border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-40 ${
          isCartExpanded ? 'h-[85vh]' : 'h-auto'
        }`}
      >
        {/* Drag Handle - Larger clickable area */}
        <div 
          className="flex justify-center py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setIsCartExpanded(!isCartExpanded)}
        >
          <div className="w-16 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
        </div>
        
        {/* Collapsed View - Centered compact layout */}
        {!isCartExpanded && (
          <div className="px-3 md:px-4 pb-3 md:pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              {/* Total & Item Count - Compact */}
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-telegram-blue dark:text-blue-400 flex-shrink-0" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold dark:text-gray-100 whitespace-nowrap">Total:</span>
                  <span className="text-lg md:text-xl font-bold text-telegram-blue dark:text-blue-400">
                    {formatCurrency(total)}
                  </span>
                </div>
                {cart.items.length > 0 && (
                  <span className="bg-telegram-blue text-white px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                    {cart.items.length}
                  </span>
                )}
              </div>
              
              {/* Checkout Button - Close to total */}
              {cart.items.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsCartExpanded(true)}
                  className="flex items-center gap-1.5 text-sm px-4 py-2"
                >
                  Checkout
                  <ChevronUp className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Expanded View - Full Cart & Payment */}
        {isCartExpanded && (
          <div className="h-[calc(100%-40px)] overflow-y-auto px-4 pb-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Cart Header */}
              <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 py-2 z-10 border-b dark:border-gray-700">
                <h2 className="text-xl font-bold dark:text-gray-100 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Keranjang ({cart.items.length})
                </h2>
                {cart.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Hapus semua item dari keranjang?\n\nTindakan ini tidak dapat dibatalkan.')) {
                        cart.clearCart();
                        toast.success('Keranjang dikosongkan');
                      }
                    }}
                  >
                    <Trash2 size={16} className="mr-1" />
                    Hapus Semua
                  </Button>
                )}
              </div>

              {/* Cart Items */}
              {cart.items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">Keranjang kosong</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Tambahkan produk untuk memulai transaksi</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.items.map((item, index) => {
                      const itemKey = `${item.product.id}-${item.productUnit?.id || 'base'}-${item.variant?.name || ''}`;
                      const isNotesExpanded = expandedItemNotes[itemKey] || false;
                      
                      return (
                      <div key={itemKey} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                        <div
                          className="flex items-start gap-2 transition-all duration-300 ease-in-out transform hover:scale-[1.01] animate-slideIn"
                        >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate dark:text-gray-200" title={item.product.name}>
                            {item.product.name}
                            {item.variant && (
                              <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                {item.variant.name}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {item.productUnit?.unit_name || item.product.base_unit} × {item.quantity}
                              <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">
                                = {item.quantity} {item.productUnit?.unit_name || item.product.base_unit}
                              </span>
                            </p>
                            {item.selectedPrice && (
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                                {item.selectedPrice.price_name}
                              </span>
                            )}
                            {item.product.prices && item.product.prices.length > 0 && (
                              <select
                                value={item.selectedPrice?.id || 'default'}
                                onChange={(e) => {
                                  if (e.target.value === 'default') {
                                    const normalPrice = item.product.prices?.find(p => p.price === item.product.selling_price);
                                    if (normalPrice) {
                                      cart.updatePrice(item.product.id, normalPrice, item.productUnit?.id, item.variant?.name);
                                    }
                                  } else {
                                    const selectedPrice = item.product.prices?.find(p => p.id === parseInt(e.target.value));
                                    if (selectedPrice) {
                                      cart.updatePrice(item.product.id, selectedPrice, item.productUnit?.id, item.variant?.name);
                                    }
                                  }
                                }}
                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              >
                                <option value="default">Normal: {formatCurrency(item.product.selling_price)}</option>
                                {item.product.prices
                                  .filter(p => p.is_active && p.min_quantity <= item.quantity)
                                  .sort((a, b) => a.price - b.price)
                                  .map(price => (
                                    <option key={price.id} value={price.id}>
                                      {price.price_name}: {formatCurrency(price.price)}
                                      {price.min_quantity > 1 && ` (min ${price.min_quantity})`}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">@</span>
                            <input
                              type="text"
                              value={formatNumberInput(item.unitPrice.toString())}
                              onChange={(e) => {
                                const rawValue = parseFormattedNumber(e.target.value);
                                if (rawValue === '') {
                                  cart.updateItemPrice(item.product.id, 0, item.productUnit?.id, item.variant?.name);
                                } else {
                                  const newPrice = parseFloat(rawValue) || 0;
                                  if (newPrice >= 0) {
                                    cart.updateItemPrice(item.product.id, newPrice, item.productUnit?.id, item.variant?.name);
                                  }
                                }
                              }}
                              className="w-28 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">/pcs</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => cart.updateQuantity(item.product.id, item.quantity - 1, item.productUnit?.id, item.variant?.name)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={12} />
                          </Button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') return;
                              const newQty = parseInt(value);
                              if (newQty > 0) {
                                cart.updateQuantity(item.product.id, newQty, item.productUnit?.id, item.variant?.name);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                cart.updateQuantity(item.product.id, 1, item.productUnit?.id, item.variant?.name);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="font-medium w-10 text-center text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1, item.productUnit?.id, item.variant?.name)}
                          >
                            <Plus size={12} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="h-7 w-7 p-0"
                            onClick={() => cart.removeItem(item.product.id, item.productUnit?.id, item.variant?.name)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                        <p className="font-bold text-sm ml-1 min-w-[70px] text-right flex-shrink-0 dark:text-gray-100">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                      
                      {/* Item Notes - Expandable */}
                      {!isNotesExpanded ? (
                        <button
                          onClick={() => setExpandedItemNotes({ ...expandedItemNotes, [itemKey]: true })}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 px-2 py-1"
                        >
                          {item.notes ? (
                            <>
                              <span>📝</span>
                              <span className="truncate max-w-[200px]">{item.notes}</span>
                              <span className="text-gray-400 ml-1">(klik untuk edit)</span>
                            </>
                          ) : (
                            <>
                              <span>📝</span>
                              <span>Tambah catatan item</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-1 px-2">
                          <textarea
                            autoFocus
                            value={item.notes || ''}
                            onChange={(e) => {
                              cart.updateItemNotes(
                                item.product.id,
                                e.target.value,
                                item.productUnit?.id,
                                item.variant?.name
                              );
                            }}
                            onBlur={() => {
                              setExpandedItemNotes({ ...expandedItemNotes, [itemKey]: false });
                            }}
                            placeholder="Contoh: Extra pedas, Tanpa bawang, Gift wrap..."
                            className="w-full text-xs p-2 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={2}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Klik di luar untuk simpan</p>
                        </div>
                      )}
                    </div>
                    );
                    })}
                  </div>

                  {/* Payment Section */}
                  <div className="border-t-2 dark:border-gray-700 pt-4 space-y-4">
                    <h3 className="text-lg font-bold dark:text-gray-100">Pembayaran</h3>
                    
                    {/* Customer Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-gray-200">Pelanggan</label>
                      <div className="relative">
                        <Input
                          placeholder="Kosongkan untuk 'Umum' atau ketik nama pelanggan..."
                          value={customerSearch}
                          onChange={(e) => handleCustomerSearch(e.target.value)}
                          onFocus={() => {
                            if (customerSearch.length > 0) setShowCustomerDropdown(true);
                          }}
                          className="pr-8"
                        />
                        {selectedCustomer && (
                          <button
                            onClick={clearCustomerSelection}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            ×
                          </button>
                        )}
                        
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                onClick={() => selectCustomer(customer)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0"
                              >
                                <div className="font-medium text-sm dark:text-gray-200">{customer.name}</div>
                                {customer.phone && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{customer.phone}</div>
                                )}
                                {customer.outstanding_balance > 0 && (
                                  <div className="text-xs text-red-600 dark:text-red-400">
                                    Hutang: {formatCurrency(customer.outstanding_balance)}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {selectedCustomer && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-xs border border-blue-200 dark:border-blue-700">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-telegram-blue dark:text-blue-400">✓ {selectedCustomer.name}</span>
                            {selectedCustomer.phone && <span className="text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</span>}
                          </div>
                          {selectedCustomer.tier && (
                            <div className="mt-1 flex items-center gap-2">
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                                style={{ 
                                  backgroundColor: selectedCustomer.tier.color + '33', 
                                  color: selectedCustomer.tier.color 
                                }}
                              >
                                {selectedCustomer.tier.icon} {selectedCustomer.tier.name}
                              </span>
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                💰 Diskon {selectedCustomer.tier.discount_percentage}%
                              </span>
                            </div>
                          )}
                          {selectedCustomer.outstanding_balance > 0 && (
                            <div className="text-red-600 dark:text-red-400 mt-1">
                              Hutang saat ini: {formatCurrency(selectedCustomer.outstanding_balance)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!selectedCustomer && customerSearch.length > 0 && filteredCustomers.length === 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs text-gray-600 dark:text-gray-300">
                          💡 Nama "<span className="font-semibold">{customerSearch}</span>" akan disimpan sebagai pelanggan umum
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-gray-200">Metode Pembayaran</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['cash', 'card', 'transfer', 'qris'].map((method) => (
                          <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                              paymentMethod === method
                                ? 'border-telegram-blue bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400 text-gray-900 dark:text-gray-100'
                                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {method.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Total & Payment Amount */}
                    <div className="border-t dark:border-gray-700 pt-4 space-y-3">
                      <div className="flex justify-between text-xl dark:text-gray-100">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-telegram-blue dark:text-blue-400">{formatCurrency(total)}</span>
                      </div>
                      
                      <Input
                        type="text"
                        label="Jumlah Bayar"
                        value={paidAmount ? formatNumberInput(paidAmount) : ''}
                        onChange={(e) => {
                          const rawValue = parseFormattedNumber(e.target.value);
                          setPaidAmount(rawValue);
                        }}
                        placeholder="Masukkan jumlah bayar (0 untuk bayar nanti)"
                        className="text-lg"
                      />

                      {/* Show change amount if overpaid */}
                      {paidAmount && parseFloat(paidAmount) >= total && (
                        <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400">
                          <span>Kembalian:</span>
                          <span>{formatCurrency(parseFloat(paidAmount) - total)}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <input
                          type="checkbox"
                          id="ignoreStock"
                          checked={ignoreStock}
                          onChange={(e) => setIgnoreStock(e.target.checked)}
                          className="w-4 h-4 text-telegram-blue rounded focus:ring-2 focus:ring-telegram-blue"
                        />
                        <label htmlFor="ignoreStock" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          Abaikan validasi stok (untuk pre-order/pesanan khusus)
                        </label>
                      </div>
                      
                      {/* Transaction Notes - Expandable */}
                      {!showTransactionNotesInput ? (
                        <button
                          onClick={() => setShowTransactionNotesInput(true)}
                          className="w-full text-left text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 p-2 border border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {transactionNotes ? (
                            <>
                              <span>📝</span>
                              <span className="flex-1 truncate">{transactionNotes}</span>
                              <span className="text-gray-400">(klik untuk edit)</span>
                            </>
                          ) : (
                            <>
                              <span>📝</span>
                              <span>Tambah catatan transaksi / struk</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Catatan Transaksi</label>
                          <textarea
                            autoFocus
                            value={transactionNotes}
                            onChange={(e) => setTransactionNotes(e.target.value)}
                            onBlur={() => setShowTransactionNotesInput(false)}
                            placeholder="Contoh: Customer VIP, Kirim jam 3, Minta struk detail, dll..."
                            className="w-full text-sm p-3 border border-blue-300 dark:border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Klik di luar untuk simpan</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pb-4">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handlePayment}
                      >
                        {!paidAmount || parseFloat(paidAmount) === 0 
                          ? 'Simpan (Bayar Nanti)' 
                          : parseFloat(paidAmount) >= total
                          ? 'Proses Pembayaran'
                          : 'Simpan Cicilan'}
                      </Button>
                      
                      <Button
                        className="w-full flex items-center justify-center gap-2"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPrinterSettings(true)}
                      >
                        <Settings className="w-4 h-4" />
                        Pengaturan Printer
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Pilih Varian - {selectedProduct.name}
                </h2>
                <button
                  onClick={() => setShowVariantModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedProduct.variants?.map((variant: any, index: number) => {
                const variantPrice = selectedProduct.selling_price + (variant.price_adjustment || 0);
                
                return (
                  <button
                    key={index}
                    onClick={() => addToCartWithVariant(selectedProduct, selectedUnit, variant, selectedQuantity)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{variant.name}</p>
                        {variant.sku_suffix && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            SKU: {selectedProduct.sku}-{variant.sku_suffix}
                          </p>
                        )}
                        {variant.barcode && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Barcode: {variant.barcode}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(variantPrice)}
                        </p>
                        {variant.price_adjustment !== 0 && (
                          <p className={`text-xs ${variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ✏️ Edit Produk - {editingProduct.name}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Produk *
                </label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  placeholder="Nama produk"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU
                  </label>
                  <Input
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                    placeholder="SKU produk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Barcode
                  </label>
                  <Input
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                    placeholder="Barcode produk"
                  />
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Harga Jual *
                  </label>
                  <Input
                    type="number"
                    value={editingProduct.selling_price}
                    onChange={(e) => setEditingProduct({...editingProduct, selling_price: parseFloat(e.target.value)})}
                    placeholder="Harga jual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stok
                  </label>
                  <Input
                    type="number"
                    value={editingProduct.stock_quantity}
                    onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value)})}
                    placeholder="Jumlah stok"
                  />
                </div>
              </div>

              {/* Base Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Satuan Dasar
                </label>
                <Input
                  value={editingProduct.base_unit}
                  onChange={(e) => setEditingProduct({...editingProduct, base_unit: e.target.value})}
                  placeholder="Satuan dasar (pcs, kg, liter, dll)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  placeholder="Deskripsi produk (opsional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveProduct}
                  className="flex-1"
                >
                  💾 Simpan Perubahan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  ❌ Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && lastTransaction && (
        <ThermalPrintPreview
          isOpen={showPrintPreview}
          onClose={() => {
            setShowPrintPreview(false);
            // Optionally redirect after closing
            // router.push('/transactions');
          }}
          transaction={lastTransaction}
          settings={printerConfig}
        />
      )}

      {/* Printer Settings Modal */}
      <PrinterSettings
        isOpen={showPrinterSettings}
        onClose={() => setShowPrinterSettings(false)}
      />
    </Layout>
  );
}
