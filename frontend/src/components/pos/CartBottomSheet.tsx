import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, ChevronUp, Trash2, Plus, Minus, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatNumberInput, parseFormattedNumber } from './helpers';

interface CartBottomSheetProps {
  cart: any;
  isCartExpanded: boolean;
  setIsCartExpanded: (v: boolean) => void;
  total: number;
  paidAmount: string;
  setPaidAmount: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  ignoreStock: boolean;
  setIgnoreStock: (v: boolean) => void;
  transactionNotes: string;
  setTransactionNotes: (v: string) => void;
  expandedItemNotes: { [key: string]: boolean };
  setExpandedItemNotes: (v: { [key: string]: boolean }) => void;
  showTransactionNotesInput: boolean;
  setShowTransactionNotesInput: (v: boolean) => void;
  customerSearch: string;
  onCustomerSearch: (v: string) => void;
  selectedCustomer: any;
  onSelectCustomer: (c: any) => void;
  onClearCustomer: () => void;
  showCustomerDropdown: boolean;
  filteredCustomers: any[];
  onPayment: () => void;
  onShowPrinterSettings: () => void;
}

export default function CartBottomSheet({
  cart, isCartExpanded, setIsCartExpanded, total,
  paidAmount, setPaidAmount, paymentMethod, setPaymentMethod,
  ignoreStock, setIgnoreStock, transactionNotes, setTransactionNotes,
  expandedItemNotes, setExpandedItemNotes, showTransactionNotesInput, setShowTransactionNotesInput,
  customerSearch, onCustomerSearch, selectedCustomer, onSelectCustomer, onClearCustomer,
  showCustomerDropdown, filteredCustomers, onPayment, onShowPrinterSettings
}: CartBottomSheetProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 lg:left-64 right-0 bg-white dark:bg-gray-800 shadow-2xl border-t-2 border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-40 ${
        isCartExpanded ? 'h-[85vh]' : 'h-auto'
      }`}
    >
      {/* Drag Handle */}
      <div
        className="flex justify-center py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsCartExpanded(!isCartExpanded)}
      >
        <div className="w-16 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
      </div>

      {/* Collapsed View */}
      {!isCartExpanded && (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
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

      {/* Expanded View */}
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
                  {cart.items.map((item: any) => {
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
                                  const normalPrice = item.product.prices?.find((p: any) => p.price === item.product.selling_price);
                                  if (normalPrice) {
                                    cart.updatePrice(item.product.id, normalPrice, item.productUnit?.id, item.variant?.name);
                                  }
                                } else {
                                  const selectedPrice = item.product.prices?.find((p: any) => p.id === parseInt(e.target.value));
                                  if (selectedPrice) {
                                    cart.updatePrice(item.product.id, selectedPrice, item.productUnit?.id, item.variant?.name);
                                  }
                                }
                              }}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="default">Normal: {formatCurrency(item.product.selling_price)}</option>
                              {item.product.prices
                                .filter((p: any) => p.is_active && p.min_quantity <= item.quantity)
                                .sort((a: any, b: any) => a.price - b.price)
                                .map((price: any) => (
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

                    {/* Item Notes */}
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
                        onChange={(e) => onCustomerSearch(e.target.value)}
                        onFocus={() => {
                          if (customerSearch.length > 0) onCustomerSearch(customerSearch);
                        }}
                        className="pr-8"
                      />
                      {selectedCustomer && (
                        <button
                          onClick={onClearCustomer}
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
                              onClick={() => onSelectCustomer(customer)}
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

                    {/* Transaction Notes */}
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
                      onClick={onPayment}
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
                      onClick={onShowPrinterSettings}
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
  );
}
