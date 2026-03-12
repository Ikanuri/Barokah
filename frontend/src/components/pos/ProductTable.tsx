import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface ProductTableProps {
  products: any[];
  currentProducts: any[];
  displayedProductsMobile: any[];
  hasMoreToExpand: boolean;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  loading: boolean;
  search: string;
  cartItems: any[];
  totalPages: number;
  currentPage: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  effectiveItemsPerPage: number;
  isMobile: boolean;
  onRefresh: () => void;
  onAddToCart: (product: any, unit?: any, quantity?: number) => void;
  onLongPressStart: (product: any) => void;
  onLongPressEnd: () => void;
  onPageChange: (page: number) => void;
}

export default function ProductTable({
  products, currentProducts, displayedProductsMobile, hasMoreToExpand,
  isExpanded, setIsExpanded, loading, search, cartItems,
  totalPages, currentPage, indexOfFirstItem, indexOfLastItem,
  effectiveItemsPerPage, isMobile, onRefresh, onAddToCart,
  onLongPressStart, onLongPressEnd, onPageChange
}: ProductTableProps) {
  return (
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
              onClick={onRefresh}
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
                    const isExpandedItem = isMobile && index >= 3 && isExpanded;
                    const animationClass = isExpandedItem ? 'animate-slideDown' : '';

                    return (
                      <tr
                        key={product.id}
                        className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer select-none ${animationClass}`}
                        onMouseDown={() => onLongPressStart(product)}
                        onMouseUp={onLongPressEnd}
                        onMouseLeave={onLongPressEnd}
                        onTouchStart={() => onLongPressStart(product)}
                        onTouchEnd={onLongPressEnd}
                        style={{
                          animation: isExpandedItem ? 'slideDown 0.3s ease-out' : 'none'
                        }}
                      >
                        <td className="py-3 px-2">
                          <div>
                            <div className="font-medium dark:text-gray-200">
                              {product.name}
                              {(() => {
                                const productCartItems = cartItems.filter(item => item.product.id === product.id);
                                if (productCartItems.length > 0) {
                                  return (
                                    <span className="ml-2 inline-flex items-center gap-1">
                                      {productCartItems.map((item, idx) => (
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
                          {product.prices && product.prices.length > 0 && (
                            <div className="relative group">
                              <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5 cursor-help">
                                💰 {product.prices.length} tier harga
                              </div>
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
                            <Button
                              size="sm"
                              className="text-xs px-2 py-1 h-7"
                              onClick={() => {
                                const bijiUnit = product.units?.find((u: any) => u.unit_name.toLowerCase() === 'biji');
                                onAddToCart(product, bijiUnit || null);
                              }}
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-2 py-1 h-7"
                              onClick={() => {
                                const bijiUnit = product.units?.find((u: any) => u.unit_name.toLowerCase() === 'biji');
                                onAddToCart(product, bijiUnit || null, 5);
                              }}
                            >
                              +5
                            </Button>
                            {product.units
                              ?.filter((unit: any) => unit.unit_name.toLowerCase() !== 'biji')
                              .slice(0, 2)
                              .map((unit: any) => (
                              <Button
                                key={unit.id}
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 h-7"
                                onClick={() => onAddToCart(product, unit)}
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
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-xs px-2 md:px-3"
              >
                ← {isMobile ? '' : 'Prev'}
              </Button>

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
                    onClick={() => onPageChange(pageNum)}
                    className="min-w-[32px] md:min-w-[36px] text-xs px-2"
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                size="sm"
                variant="outline"
                onClick={() => onPageChange(currentPage + 1)}
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
  );
}
