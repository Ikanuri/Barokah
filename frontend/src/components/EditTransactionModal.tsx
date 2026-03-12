'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Minus, Trash2, Search, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ThermalPrintPreview from '@/components/ThermalPrintPreview';
import { invalidateTransactionsCache } from '@/lib/db';
import { broadcastSync } from '@/lib/broadcast';

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
  notes?: string; // ✅ Add notes field
}

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
  items_count?: number;
  status?: string;
  items?: TransactionItem[];
  notes?: string; // ✅ Add transaction notes field
  change_returned?: boolean;
  change_amount?: number;
}

interface ProductUnit {
  id: number;
  unit_name: string;
  unit_type: string;
  conversion_value: number;
  selling_price: number;
  barcode?: string;
}

interface Product {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: {
    name: string;
  };
  base_unit?: string;
  selling_price: number;
  stock: number;
  stock_quantity?: number;
  is_active: boolean;
  variants?: Array<{ name: string }>;
  units?: ProductUnit[];
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onUpdate?: () => void;
}

export default function EditTransactionModal({ isOpen, onClose, transaction, onUpdate }: EditTransactionModalProps) {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState(transaction.payment_method || 'cash');
  const [paymentAmount, setPaymentAmount] = useState<number | string>(transaction.payment_amount || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number | string>(1);
  const [selectedPrice, setSelectedPrice] = useState<number | string>('');
  const [ignoreStock, setIgnoreStock] = useState(false);
  
  // State for editable item notes
  const [expandedItemNotes, setExpandedItemNotes] = useState<{ [key: number]: boolean }>({});
  
  // State for print preview
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItems(transaction.items || []);
      setPaymentMethod(transaction.payment_method || 'cash');
      // Always start empty: effectiveChange will show current kekurangan live.
      setPaymentAmount('');
      setHasChanges(false);
      fetchProducts();
    }
  }, [isOpen, transaction]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', {
        params: {
          per_page: 10000,
          is_active: 1
        }
      });
      const productsData = response.data.data || [];
      setProducts(productsData);
    } catch {
      toast.error('Gagal memuat produk');
    }
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta), subtotal: (item.quantity + delta) * item.price }
        : item
    ));
    setHasChanges(true);
  };

  const handleDeleteItem = (itemId: number) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setHasChanges(true);
  };
  
  const handleUpdateItemNotes = (itemId: number, notes: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, notes: notes || undefined }
        : item
    ));
    setHasChanges(true);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error('Pilih produk terlebih dahulu');
      return;
    }

    const qty = typeof selectedQuantity === 'string' ? parseInt(selectedQuantity) || 1 : selectedQuantity;
    const price = typeof selectedPrice === 'string' ? parseFloat(selectedPrice) || 0 : selectedPrice;

    if (!ignoreStock && qty > (selectedProduct.stock_quantity ?? selectedProduct.stock)) {
      toast.error('Stok tidak mencukupi');
      return;
    }

    const newItem: TransactionItem = {
      id: Date.now(),
      product_id: selectedProduct.id,
      product_unit_id: selectedUnit?.id || null,
      product_name: selectedProduct.name,
      unit_name: selectedUnit?.unit_name || selectedProduct.base_unit,
      quantity: qty,
      price: price,
      subtotal: qty * price,
    };

    setItems(prev => [...prev, newItem]);
    setSelectedProduct(null);
    setSelectedUnit(null);
    setSearchQuery('');
    setSelectedQuantity(1);
    setSelectedPrice('');
    setHasChanges(true);
    toast.success('Produk ditambahkan');
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Transaksi harus memiliki minimal 1 item');
      return;
    }

    setIsLoading(true);
    try {
      const itemsChanged = JSON.stringify(items) !== JSON.stringify(transaction.items || []);
      // Send payment if canEditPayment and user entered a positive amount
      const paymentChanged = canEditPayment && paymentAmountNum > 0;

      if (itemsChanged) {
        const itemsPayload = {
          items: items.map(item => ({
            product_id: item.product_id,
            product_unit_id: item.product_unit_id,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes || null,
          })),
          ignore_stock: ignoreStock,
        };

        await api.put(`/transactions/${transaction.id}`, itemsPayload);
      }

      if (paymentChanged) {
        const paymentPayload = {
          amount: typeof paymentAmount === 'string' ? parseFloat(paymentAmount) || 0 : paymentAmount,
          payment_method: paymentMethod,
        };

        await api.post(`/transactions/${transaction.id}/payment`, paymentPayload);
      }

      toast.success('Transaksi berhasil diperbarui');
      setHasChanges(false);
      
      broadcastSync('transaction_updated', { transactionId: transaction.id });
      await invalidateTransactionsCache();
      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnChange = async () => {
    try {
      setIsLoading(true);
      await api.post(`/transactions/${transaction.id}/return-change`);
      toast.success('Kembalian dicatat sebagai sudah dikembalikan');
      invalidateTransactionsCache();
      broadcastSync('transaction_updated');
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mencatat kembalian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndoReturnChange = async () => {
    try {
      setIsLoading(true);
      await api.post(`/transactions/${transaction.id}/undo-return-change`);
      toast.success('Pencatatan kembalian dibatalkan');
      invalidateTransactionsCache();
      broadcastSync('transaction_updated');
      onUpdate?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan pencatatan kembalian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setItems(transaction.items || []);
    setPaymentMethod(transaction.payment_method || 'cash');
    setPaymentAmount('');
    setHasChanges(false);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const paymentAmountNum = typeof paymentAmount === 'string' ? parseFloat(paymentAmount) || 0 : paymentAmount;
  // paidTotalBase: cumulative amount already paid before this session
  const paidTotalBase = Number(transaction.paid_total ?? transaction.payment_amount ?? 0);
  // remaining: still owed
  const remaining = Math.max(0, total - paidTotalBase);
  // overpaid: use change_amount from backend (paid_total is capped at total by makePayment,
  // so paidTotalBase - total would always be 0 even when there is real kembalian)
  const overpaid = Number(transaction.change ?? transaction.change_amount ?? 0);
  // effectiveChange: >0 kembalian, <0 kekurangan, 0 lunas
  const effectiveChange = paidTotalBase + paymentAmountNum - total;
  // canEditPayment: show payment input only when something is still owed
  const canEditPayment = remaining > 0;

  const filteredProducts = products.filter(product => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    // Basic fields
    const nameMatch = product.name?.toLowerCase().includes(q);
    const codeMatch = product.code?.toLowerCase().includes(q);
    const barcodeMatch = product.barcode?.toLowerCase().includes(q);

    // Variant match
    let variantMatch = false;
    if (Array.isArray(product.variants)) {
      variantMatch = product.variants.some((v: { name: string }) => v?.name?.toLowerCase().includes(q));
    }

    // Unit match
    let unitMatch = false;
    if (Array.isArray(product.units)) {
      unitMatch = product.units.some((u: { unit_name: string }) => u?.unit_name?.toLowerCase().includes(q));
    }

    return nameMatch || codeMatch || barcodeMatch || variantMatch || unitMatch;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={false}>
      <ModalBody>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-700 dark:text-gray-300">
              Edit Transaksi
            </h2>
            <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {transaction.customer?.name || transaction.guest_name || 'Umum'}
            </p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {transaction.invoice_number}
            </p>
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">
            Items
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Produk
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Qty
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Harga
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Subtotal
                  </th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => {
                  const isNotesExpanded = expandedItemNotes[item.id] || false;
                  
                  return (
                  <tr key={item.id}>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.product_name}
                        </div>
                        {item.unit_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Satuan: {item.unit_name}
                          </div>
                        )}
                        {item.variant_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Varian: {item.variant_name}
                          </div>
                        )}
                        
                        {/* Editable Item Notes */}
                        <div className="mt-2">
                          {!isNotesExpanded ? (
                            <button
                              onClick={() => setExpandedItemNotes({ ...expandedItemNotes, [item.id]: true })}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {item.notes ? (
                                <>
                                  <span>📝</span>
                                  <span className="italic truncate max-w-[200px]">{item.notes}</span>
                                  <span className="text-gray-400">(klik untuk edit)</span>
                                </>
                              ) : (
                                <>
                                  <span>📝</span>
                                  <span>Tambah catatan</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <textarea
                                autoFocus
                                value={item.notes || ''}
                                onChange={(e) => handleUpdateItemNotes(item.id, e.target.value)}
                                onBlur={() => setExpandedItemNotes({ ...expandedItemNotes, [item.id]: false })}
                                placeholder="Catatan item..."
                                className="w-full text-xs p-2 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                rows={2}
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400">Klik di luar untuk simpan</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="text-center">
                          <div className="text-sm md:text-base text-gray-900 dark:text-white font-medium">
                            {item.quantity}
                          </div>
                          {item.unit_name && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.unit_name}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-900 dark:text-white">
            Tambah Produk
          </h4>
          
          <div className="space-y-2 md:space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk..."
                className="w-full pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-[44px]"
              />
            </div>

            {searchQuery && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedUnit(null);
                      setSelectedPrice(product.selling_price);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Stok: {product.stock_quantity ?? product.stock} {product.base_unit}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(product.selling_price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <div className="flex-1">
                    <div className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                      {selectedProduct.name}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      Harga normal: {formatCurrency(selectedProduct.selling_price)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedUnit(null);
                      setSelectedPrice('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-2 md:space-y-3">
                  {/* Pilihan Satuan - ALWAYS SHOW */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Satuan {selectedProduct.units && selectedProduct.units.length > 0 ? `(${selectedProduct.units.length + 1} pilihan)` : '(Satuan dasar)'}
                    </label>
                    <select
                      value={selectedUnit?.id || ''}
                      onChange={(e) => {
                        const unitId = parseInt(e.target.value);
                        if (unitId) {
                          const unit = selectedProduct.units?.find(u => u.id === unitId);
                          setSelectedUnit(unit || null);
                          setSelectedPrice(unit?.selling_price || selectedProduct.selling_price);
                        } else {
                          setSelectedUnit(null);
                          setSelectedPrice(selectedProduct.selling_price);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-[44px]"
                    >
                      <option value="">
                        {selectedProduct.base_unit || 'Pcs'} - {formatCurrency(selectedProduct.selling_price)} (Dasar)
                      </option>
                      {selectedProduct.units && selectedProduct.units.length > 0 && selectedProduct.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_name} - {formatCurrency(unit.selling_price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Qty
                      </label>
                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={() => {
                            const current = typeof selectedQuantity === 'string' ? parseInt(selectedQuantity) || 1 : selectedQuantity;
                            setSelectedQuantity(Math.max(1, current - 1));
                          }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <input
                          type="number"
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 md:w-16 text-center text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-2 min-h-[44px]"
                        />
                        <button
                          onClick={() => {
                            const current = typeof selectedQuantity === 'string' ? parseInt(selectedQuantity) || 1 : selectedQuantity;
                            setSelectedQuantity(current + 1);
                          }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Harga
                      </label>
                      <Input
                        type="number"
                        value={selectedPrice}
                        onChange={(e) => setSelectedPrice(e.target.value === '' ? '' : e.target.value)}
                        className="text-right text-sm md:text-base py-2 min-h-[44px]"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subtotal:
                    </span>
                    <span className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency((typeof selectedQuantity === 'string' ? parseInt(selectedQuantity) || 0 : selectedQuantity) * (typeof selectedPrice === 'string' ? parseFloat(selectedPrice) || 0 : selectedPrice))}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedUnit && (
                      <span>Satuan: {selectedUnit.unit_name} (konversi: {selectedUnit.conversion_value} {selectedProduct.base_unit})</span>
                    )}
                  </div>
                  
                  <Button onClick={handleAddProduct} className="w-full min-h-[44px]">
                    Tambah ke Transaksi
                  </Button>
                </div>
              </div>
            )}
            
            <label className="flex items-center gap-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 touch-manipulation min-h-[44px]">
              <input
                type="checkbox"
                checked={ignoreStock}
                onChange={(e) => setIgnoreStock(e.target.checked)}
                className="rounded w-4 h-4"
              />
              Abaikan validasi stok
            </label>
          </div>
        </div>

        {/* Transaction Notes Display */}
        {transaction.notes && (
          <div className="mt-4 p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">📝</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Catatan Transaksi:
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                  {transaction.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 md:mt-6 flex justify-end">
          <div className="w-full md:w-96 space-y-3 md:space-y-4">
            <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm md:text-base text-gray-700 dark:text-gray-300">
                <span>Total:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(total)}
                </span>
              </div>

              {canEditPayment ? (
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-[44px]"
                  >
                    <option value="cash">Tunai</option>
                    <option value="card">Kartu</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              ) : (
                <div className="flex justify-between text-xs md:text-sm text-gray-700 dark:text-gray-300">
                  <span>Metode:</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                    {paymentMethod === 'cash' ? 'Tunai' : 
                     paymentMethod === 'card' ? 'Kartu' : 
                     paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
                  </span>
                </div>
              )}

              {!canEditPayment && (
                <>
                  <div className="flex justify-between text-sm md:text-base text-gray-700 dark:text-gray-300">
                    {transaction.change_returned ? (
                      <>
                        <span>Status:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">LUNAS ✓</span>
                      </>
                    ) : overpaid > 0 ? (
                      <>
                        <span>Kembalian:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(overpaid)}</span>
                      </>
                    ) : (
                      <>
                        <span>Status:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">LUNAS ✓</span>
                      </>
                    )}
                  </div>

                  {/* Kembalian sudah dikembalikan — tampilkan info + tombol undo */}
                  {transaction.change_returned && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        ↩ Kembalian {formatCurrency(Number(transaction.change_amount) || 0)} sudah dikembalikan
                      </span>
                      <button
                        onClick={handleUndoReturnChange}
                        disabled={isLoading || hasChanges}
                        className="text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}

                  {/* Belum dikembalikan — tampilkan tombol "sudah dikembalikan" */}
                  {!transaction.change_returned && overpaid > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleReturnChange}
                      disabled={isLoading || hasChanges}
                      className="w-full text-xs text-amber-700 border-amber-400 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      ✓ Kembalian {formatCurrency(overpaid)} sudah dikembalikan ke pelanggan
                    </Button>
                  )}
                  {!transaction.change_returned && overpaid > 0 && hasChanges && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Simpan perubahan item terlebih dahulu sebelum mencatat kembalian
                    </p>
                  )}
                </>
              )}

              {canEditPayment && (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dibayar
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={(() => {
                        const num = parseFloat(String(paymentAmount));
                        if (isNaN(num) || paymentAmount === '') return '';
                        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                      })()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, '');
                        setPaymentAmount(raw === '' ? '' : raw);
                        setHasChanges(true);
                      }}
                      className="text-right text-sm md:text-base min-h-[44px]"
                    />
                  </div>

                  <div className="flex justify-between text-sm md:text-base text-gray-700 dark:text-gray-300">
                    {effectiveChange > 0 ? (
                      <>
                        <span>Kembalian:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(effectiveChange)}</span>
                      </>
                    ) : effectiveChange === 0 && paymentAmountNum > 0 ? (
                      <>
                        <span>Status:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">LUNAS ✓</span>
                      </>
                    ) : (
                      <>
                        <span>Kekurangan:</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(Math.abs(effectiveChange))}</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex gap-2 justify-between w-full">
          <Button 
            variant="outline" 
            onClick={() => setShowPrintPreview(true)} 
            className="min-h-[44px]"
          >
            <Printer size={16} className="mr-2" />
            Print Struk
          </Button>
          
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" onClick={handleReset} className="min-h-[44px]">
                Reset
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="min-h-[44px]">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              className="min-h-[44px]"
              disabled={isLoading || items.length === 0}
            >
              {isLoading ? 'Memproses...' : 'Bayar'}
            </Button>
          </div>
        </div>
      </ModalFooter>
      
      {/* Thermal Print Preview */}
      {showPrintPreview && (
        <ThermalPrintPreview
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          transaction={{
            id: transaction.id.toString(),
            invoice_number: transaction.invoice_number,
            transaction_date: transaction.date,
            items: items.map(item => ({
              product: {
                name: item.product_name,
                sku: '',
              },
              productUnit: item.unit_name ? {
                unit_name: item.unit_name
              } : undefined,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.subtotal,
              notes: item.notes,
            })),
            subtotal: total,
            discount: 0,
            tax: 0,
            total: total,
            paid_amount: (() => {
              const changeAmt = Number(transaction.change_amount ?? transaction.change ?? 0);
              // paid_total is capped at total by makePayment; reconstruct original paid from change_amount
              return changeAmt > 0
                ? Number(transaction.total) + changeAmt
                : (transaction.paid_total ?? transaction.payment_amount ?? 0);
            })(),
            change: transaction.change ?? 0,
            payment_method: paymentMethod,
            payment_status: transaction.payment_status || 'paid',
            customer: transaction.customer ? {
              name: transaction.customer.name
            } : undefined,
            guest_name: transaction.guest_name || undefined,
            notes: transaction.notes,
          }}
        />
      )}
    </Modal>
  );
}
