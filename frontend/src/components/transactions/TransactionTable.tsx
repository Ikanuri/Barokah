import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Transaction, DateGroup } from './types';
import { groupTransactionsByDate, getPaymentMethodBadge } from './utils';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  onViewDetail: (transaction: Transaction) => void;
}

export default function TransactionTable({ transactions, loading, onViewDetail }: TransactionTableProps) {
  return (
    <Card>
      <CardHeader className="bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Daftar Transaksi</h2>
          {!loading && transactions.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {formatCurrency(transactions.reduce((sum, t) => sum + t.total, 0))}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-telegram-blue dark:border-blue-400"></div>
            <p className="mt-3 text-gray-600 dark:text-gray-400 font-medium">Memuat data transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Receipt size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 font-medium text-lg">Belum ada transaksi</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Transaksi yang dibuat akan muncul di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {groupTransactionsByDate(transactions).map((group) => (
              <div key={group.date}>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 md:px-6 py-3 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200">
                      📅 {group.dateFormatted}
                    </h3>
                    <div className="flex items-center gap-3 text-xs md:text-sm">
                      <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded-full font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                        {group.count} transaksi
                      </span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full font-bold text-green-800 dark:text-green-400 border border-green-300 dark:border-green-700">
                        {formatCurrency(group.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                      <tr>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Pelanggan / Invoice</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">Waktu</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden lg:table-cell">Kasir</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Items</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Total</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden md:table-cell">Status Bayar</th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase hidden sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                      {group.transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => onViewDetail(transaction)}
                        >
                          <td className="px-3 md:px-6 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {transaction.customer?.name || transaction.guest_name || 'Umum'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{transaction.invoice_number}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 md:hidden mt-0.5">
                              {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 hidden md:table-cell">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 hidden lg:table-cell">
                            <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{transaction.cashier.name}</div>
                          </td>
                          <td className="px-3 md:px-6 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              {transaction.items_count}
                            </span>
                          </td>
                          <td className="px-3 md:px-6 py-3 text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(transaction.total)}</div>
                            {transaction.payment_status === 'partial' && transaction.paid_total !== undefined && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">Dibayar: {formatCurrency(transaction.paid_total)}</div>
                            )}
                            <div className="md:hidden mt-1">
                              {(() => {
                                const paidTotal = transaction.paid_total || 0;
                                const total = transaction.total;
                                const changeAmount = transaction.change || 0;
                                if (changeAmount > 0) {
                                  return <span className="inline-block text-xs font-semibold text-green-600 dark:text-green-400">Kembali: {formatCurrency(changeAmount)}</span>;
                                } else if (transaction.payment_status === 'paid') {
                                  return <span className="inline-block text-xs text-gray-500 dark:text-gray-400">Lunas ✓</span>;
                                } else {
                                  return <span className="inline-block text-xs font-semibold text-red-600 dark:text-red-400">Kurang: {formatCurrency(total - paidTotal)}</span>;
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 text-right hidden md:table-cell">
                            {(() => {
                              const paidTotal = transaction.paid_total || 0;
                              const total = transaction.total;
                              const changeAmount = transaction.change || 0;
                              if (changeAmount > 0) {
                                return <div className="text-sm font-semibold text-green-600 dark:text-green-400">Kembalian<br />{formatCurrency(changeAmount)}</div>;
                              } else if (transaction.payment_status === 'paid') {
                                return <div className="text-sm text-gray-500 dark:text-gray-400">Lunas</div>;
                              } else {
                                return <div className="text-sm font-semibold text-red-600 dark:text-red-400">Kurang<br />{formatCurrency(total - paidTotal)}</div>;
                              }
                            })()}
                          </td>
                          <td className="px-3 md:px-6 py-3 hidden sm:table-cell">
                            <div className="space-y-1">
                              {getPaymentMethodBadge(transaction.payment_method)}
                              {transaction.payment_status === 'unpaid' && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Belum Lunas</div>
                              )}
                              {transaction.payment_status === 'partial' && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">Cicilan</div>
                              )}
                              {transaction.payment_status === 'paid' && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Lunas</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
