'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ProductUnitsManager, { ProductUnit } from '@/components/ProductUnitsManager';
import ProductVariantsManager, { ProductVariant } from '@/components/ProductVariantsManager';
import ProductPricesManager, { ProductPrice } from '@/components/ProductPricesManager';

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category: { id: number; name: string };
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

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const defaultForm = {
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
  is_active: true,
};

export default function ProductFormModal({ isOpen, editingProduct, onClose, onSaved }: ProductFormModalProps) {
  const [formData, setFormData] = useState(defaultForm);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [alternativePrices, setAlternativePrices] = useState<ProductPrice[]>([]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen]);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        sku: editingProduct.sku,
        barcode: editingProduct.barcode || '',
        name: editingProduct.name,
        category_id: editingProduct.category?.id?.toString() || '',
        base_price: editingProduct.base_price?.toString() || '',
        selling_price: editingProduct.selling_price.toString(),
        base_unit: editingProduct.base_unit || 'biji',
        stock_quantity: editingProduct.stock_quantity.toString(),
        minimum_stock: editingProduct.minimum_stock.toString(),
        description: editingProduct.description || '',
        is_active: true,
      });
      const loadedUnits = (editingProduct.units || []).map((unit, index) => ({
        ...unit,
        order: unit.order || index + 1,
      }));
      setUnits(loadedUnits);
      setVariants(editingProduct.variants || []);
      setAlternativePrices(editingProduct.prices || []);
    } else {
      setFormData(defaultForm);
      setUnits([]);
      setVariants([]);
      setAlternativePrices([]);
    }
  }, [editingProduct]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || response.data || []);
    } catch {
      // ignore
    }
  };

  const handleAddQuickCategory = async (categoryName: string) => {
    try {
      const response = await api.post('/categories', { name: categoryName, description: '' });
      toast.success(`Kategori "${categoryName}" berhasil ditambahkan!`);
      await fetchCategories();
      const newCategory = response.data.data;
      setFormData((prev) => ({ ...prev, category_id: newCategory.id.toString() }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menambah kategori');
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
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        base_price: parseFloat(formData.base_price) || parseFloat(formData.selling_price),
        selling_price: parseFloat(formData.selling_price),
        base_unit: formData.base_unit,
        stock_quantity: parseInt(formData.stock_quantity),
        minimum_stock: parseInt(formData.minimum_stock),
        description: formData.description,
        is_active: formData.is_active,
        units,
        variants: variants.length > 0 ? variants : null,
        prices: alternativePrices.length > 0 ? alternativePrices : null,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        toast.success('Produk berhasil diperbarui');
      } else {
        await api.post('/products', data);
        toast.success('Produk berhasil ditambahkan');
      }

      await onSaved();
      window.dispatchEvent(new CustomEvent('productUpdated', {
        detail: { action: editingProduct ? 'update' : 'create' },
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl my-8">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button
                onClick={onClose}
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
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const categoryName = prompt('Nama kategori baru:');
                      if (categoryName) handleAddQuickCategory(categoryName);
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
                  {formData.base_price && formData.selling_price && (() => {
                    const basePrice = parseFloat(formData.base_price) || 0;
                    const sellingPrice = parseFloat(formData.selling_price) || 0;
                    const profit = sellingPrice - basePrice;
                    const margin = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : 0;
                    return (
                      <p className={`mt-1 text-xs font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Laba: {formatCurrency(profit)} ({margin}%)
                      </p>
                    );
                  })()}
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

              <ProductUnitsManager
                units={units}
                onUnitsChange={setUnits}
                basePrice={parseFloat(formData.selling_price) || 0}
                baseUnit={formData.base_unit || 'biji'}
              />

              <ProductVariantsManager
                variants={variants}
                onChange={setVariants}
                basePrice={parseFloat(formData.selling_price) || 0}
              />

              <ProductPricesManager
                prices={alternativePrices}
                onPricesChange={setAlternativePrices}
                basePrice={parseFloat(formData.selling_price) || 0}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
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
  );
}
