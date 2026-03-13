import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface VariantModalProps {
  show: boolean;
  product: any;
  unit: any;
  quantity: number;
  onSelect: (product: any, unit: any, variant: any, quantity: number) => void;
  onClose: () => void;
}

export default function VariantModal({ show, product, unit, quantity, onSelect, onClose }: VariantModalProps) {
  if (!show || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Pilih Varian - {product.name}
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
        <CardContent className="space-y-3">
          {product.variants?.map((variant: any, index: number) => {
            const variantPrice = product.selling_price + (variant.price_adjustment || 0);

            return (
              <button
                key={index}
                onClick={() => onSelect(product, unit, variant, quantity)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{variant.name}</p>
                    {variant.sku_suffix && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        SKU: {product.sku}-{variant.sku_suffix}
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
  );
}
