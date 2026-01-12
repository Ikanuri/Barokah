'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface ProductPrice {
  id?: number;
  product_id?: number;
  price_type: string;
  price_name: string;
  price: number;
  min_quantity: number;
  is_active: boolean;
  priority: number;
  description?: string;
}

interface ProductPricesManagerProps {
  prices: ProductPrice[];
  onPricesChange: (prices: ProductPrice[]) => void;
  basePrice: number; // Default/normal price for reference
}

const PRICE_TYPES = [
  { value: 'normal', label: 'Normal', color: 'bg-gray-100 text-gray-800' },
  { value: 'bronze', label: 'Bronze 🥉', color: 'bg-orange-100 text-orange-800' },
  { value: 'silver', label: 'Silver 🥈', color: 'bg-gray-200 text-gray-800' },
  { value: 'gold', label: 'Gold 🥇', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'platinum', label: 'Platinum 💎', color: 'bg-purple-100 text-purple-800' },
  { value: 'wholesale', label: 'Grosir', color: 'bg-green-100 text-green-800' },
  { value: 'super_wholesale', label: 'Super Grosir', color: 'bg-blue-100 text-blue-800' },
];

export default function ProductPricesManager({ prices, onPricesChange, basePrice }: ProductPricesManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddPrice = () => {
    const newPrice: ProductPrice = {
      price_type: 'wholesale',
      price_name: '',
      price: 0,
      min_quantity: 1,
      is_active: true,
      priority: prices.length + 1,
      description: '',
    };
    onPricesChange([...prices, newPrice]);
    setIsExpanded(true);
  };

  const handleUpdatePrice = (index: number, field: keyof ProductPrice, value: any) => {
    const updated = [...prices];
    updated[index] = { ...updated[index], [field]: value };
    onPricesChange(updated);
  };

  const handleRemovePrice = (index: number) => {
    if (confirm('Hapus harga alternatif ini?')) {
      const updated = prices.filter((_, i) => i !== index);
      onPricesChange(updated);
    }
  };

  const calculateDiscount = (price: number) => {
    if (!basePrice || basePrice === 0) return '0%';
    const discount = ((basePrice - price) / basePrice) * 100;
    return discount > 0 ? `${discount.toFixed(1)}% OFF` : `+${Math.abs(discount).toFixed(1)}%`;
  };

  return (
    <div className="border-2 border-[var(--separator)] rounded-xl p-4 md:p-5 bg-[var(--fill-tertiary)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-[var(--ios-green)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Harga Alternatif</h3>
          <span className="text-xs text-[var(--text-secondary)]">
            ({prices.length} {prices.length === 1 ? 'harga' : 'harga'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {prices.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Sembunyikan' : 'Tampilkan'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleAddPrice}
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            Tambah Harga
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Atur harga khusus berdasarkan tipe pelanggan atau minimum pembelian. 
        Sistem akan otomatis memilih harga terbaik.
      </p>

      {prices.length > 0 && isExpanded && (
        <div className="space-y-3 mt-4">
          {prices.map((price, index) => (
            <div key={index} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipe Harga
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    value={price.price_type}
                    onChange={(e) => handleUpdatePrice(index, 'price_type', e.target.value)}
                  >
                    {PRICE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Harga
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="Contoh: Harga Member, Grosir 10 pcs"
                    value={price.price_name}
                    onChange={(e) => handleUpdatePrice(index, 'price_name', e.target.value)}
                  />
                </div>

                {/* Price Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Harga
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="0"
                      value={price.price || ''}
                      onChange={(e) => handleUpdatePrice(index, 'price', parseFloat(e.target.value) || 0)}
                    />
                    {basePrice > 0 && price.price > 0 && (
                      <span className={`absolute right-2 top-2 text-xs font-medium px-2 py-0.5 rounded ${
                        price.price < basePrice ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }`}>
                        {calculateDiscount(price.price)}
                      </span>
                    )}
                  </div>
                  {price.price > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(price.price)}
                    </p>
                  )}
                </div>

                {/* Min Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="1"
                    value={price.min_quantity || 1}
                    onChange={(e) => handleUpdatePrice(index, 'min_quantity', parseInt(e.target.value) || 1)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Harga berlaku jika beli minimal {price.min_quantity} pcs
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioritas
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="1"
                    value={price.priority || 1}
                    onChange={(e) => handleUpdatePrice(index, 'priority', parseInt(e.target.value) || 1)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Angka lebih tinggi = prioritas lebih tinggi
                  </p>
                </div>

                {/* Active Status */}
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={price.is_active}
                      onChange={(e) => handleUpdatePrice(index, 'is_active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktif
                    </span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={2}
                  placeholder="Contoh: Khusus pelanggan member aktif"
                  value={price.description || ''}
                  onChange={(e) => handleUpdatePrice(index, 'description', e.target.value)}
                />
              </div>

              {/* Remove Button */}
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemovePrice(index)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} className="mr-1" />
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {prices.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          <p>Belum ada harga alternatif.</p>
          <p className="mt-1">Klik "Tambah Harga" untuk membuat harga khusus.</p>
        </div>
      )}

      {/* Summary - Always visible when there are prices */}
      {prices.length > 0 && !isExpanded && (
        <div className="mt-3 space-y-2">
          {prices.map((price, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  PRICE_TYPES.find(t => t.value === price.price_type)?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {PRICE_TYPES.find(t => t.value === price.price_type)?.label || price.price_type}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {price.price_name || 'Tanpa nama'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-400">
                  Min {price.min_quantity} pcs
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(price.price)}
                </span>
                {basePrice > 0 && price.price !== basePrice && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    price.price < basePrice ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  }`}>
                    {calculateDiscount(price.price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
