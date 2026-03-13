import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EditProductModalProps {
  show: boolean;
  product: any;
  onChange: (product: any) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditProductModal({ show, product, onChange, onSave, onClose }: EditProductModalProps) {
  if (!show || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ✏️ Edit Produk - {product.name}
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
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Produk *
            </label>
            <Input
              value={product.name}
              onChange={(e) => onChange({...product, name: e.target.value})}
              placeholder="Nama produk"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU
              </label>
              <Input
                value={product.sku || ''}
                onChange={(e) => onChange({...product, sku: e.target.value})}
                placeholder="SKU produk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Barcode
              </label>
              <Input
                value={product.barcode || ''}
                onChange={(e) => onChange({...product, barcode: e.target.value})}
                placeholder="Barcode produk"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Harga Jual *
              </label>
              <Input
                type="number"
                value={product.selling_price}
                onChange={(e) => onChange({...product, selling_price: parseFloat(e.target.value)})}
                placeholder="Harga jual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stok
              </label>
              <Input
                type="number"
                value={product.stock_quantity}
                onChange={(e) => onChange({...product, stock_quantity: parseInt(e.target.value)})}
                placeholder="Jumlah stok"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Satuan Dasar
            </label>
            <Input
              value={product.base_unit}
              onChange={(e) => onChange({...product, base_unit: e.target.value})}
              placeholder="Satuan dasar (pcs, kg, liter, dll)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi
            </label>
            <textarea
              value={product.description || ''}
              onChange={(e) => onChange({...product, description: e.target.value})}
              placeholder="Deskripsi produk (opsional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onSave}
              className="flex-1"
            >
              💾 Simpan Perubahan
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              ❌ Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
