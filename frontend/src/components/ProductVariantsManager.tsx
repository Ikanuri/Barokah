'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface ProductVariant {
  name: string;
  sku_suffix?: string;
  barcode?: string;
  price_adjustment?: number;
}

interface ProductVariantsManagerProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  basePrice: number;
}

export default function ProductVariantsManager({ variants, onChange, basePrice }: ProductVariantsManagerProps) {
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(variants);

  useEffect(() => {
    setLocalVariants(variants);
  }, [variants]);

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      name: '',
      sku_suffix: '',
      barcode: '',
      price_adjustment: 0,
    };
    const updated = [...localVariants, newVariant];
    setLocalVariants(updated);
    onChange(updated);
  };

  const handleRemoveVariant = (index: number) => {
    const updated = localVariants.filter((_, i) => i !== index);
    setLocalVariants(updated);
    onChange(updated);
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = localVariants.map((variant, i) => {
      if (i === index) {
        return { ...variant, [field]: value };
      }
      return variant;
    });
    setLocalVariants(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3 border-2 border-[var(--separator)] rounded-xl p-4 md:p-5 bg-[var(--fill-tertiary)]">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Varian Produk
          <span className="ml-2 text-xs text-[var(--text-secondary)]">(Opsional - untuk produk dengan varian warna/rasa/ukuran)</span>
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddVariant}
        >
          <Plus size={16} className="mr-1" />
          Tambah Varian
        </Button>
      </div>

      {localVariants.length === 0 ? (
        <div className="text-sm text-[var(--text-secondary)] italic p-4 bg-[var(--fill-secondary)] rounded-lg border-2 border-dashed border-[var(--separator)]">
          Tidak ada varian. Klik "Tambah Varian" untuk menambahkan varian produk (contoh: warna Merah, Biru, Hijau)
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {localVariants.map((variant, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-[var(--fill-secondary)] rounded-lg border border-[var(--separator)]"
            >
              <div className="flex-shrink-0 mt-2 text-gray-400 dark:text-gray-500 cursor-move">
                <GripVertical size={16} />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Variant Name */}
                <div>
                  <Input
                    type="text"
                    placeholder="Nama varian (Merah, Biru, dll)"
                    value={variant.name}
                    onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nama Varian</p>
                </div>

                {/* SKU Suffix */}
                <div>
                  <Input
                    type="text"
                    placeholder="RED, BLU, dll"
                    value={variant.sku_suffix || ''}
                    onChange={(e) => handleVariantChange(index, 'sku_suffix', e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kode SKU</p>
                </div>

                {/* Barcode */}
                <div>
                  <Input
                    type="text"
                    placeholder="Barcode varian"
                    value={variant.barcode || ''}
                    onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Barcode</p>
                </div>

                {/* Price Adjustment */}
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Selisih harga"
                    value={variant.price_adjustment || 0}
                    onChange={(e) => handleVariantChange(index, 'price_adjustment', parseFloat(e.target.value) || 0)}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {variant.price_adjustment !== undefined && variant.price_adjustment !== 0 ? (
                      <span className={variant.price_adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {variant.price_adjustment > 0 ? '+' : ''}{variant.price_adjustment.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      'Harga sama'
                    )}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveVariant(index)}
                className="flex-shrink-0 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {localVariants.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <strong>💡 Cara Kerja:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Setiap varian akan muncul sebagai pilihan saat transaksi POS</li>
            <li>SKU akan otomatis ditambahkan suffix (contoh: PRF-001-RED)</li>
            <li>Harga bisa sama atau berbeda untuk setiap varian</li>
          </ul>
        </div>
      )}
    </div>
  );
}
