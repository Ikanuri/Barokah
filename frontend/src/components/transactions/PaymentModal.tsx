import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { Transaction } from './types';

interface PaymentModalProps {
  show: boolean;
  transaction: Transaction | null;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function PaymentModal({ show, transaction, paymentAmount, setPaymentAmount, paymentMethod, setPaymentMethod, onSubmit, onClose }: PaymentModalProps) {
  if (!show || !transaction) return null;

  const remaining = transaction.total - (transaction.paid_total || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader>
          <h2 className="text-xl font-bold dark:text-gray-100">Catat Pembayaran</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{transaction.invoice_number}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-bold dark:text-gray-100">{formatCurrency(transaction.total)}</span>
            </div>
            {transaction.paid_total !== undefined && transaction.paid_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sudah Dibayar</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(transaction.paid_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t dark:border-gray-600 pt-2">
              <span className="text-gray-700 dark:text-gray-300">Sisa Hutang</span>
              <span className="text-red-600 dark:text-red-400">{formatCurrency(remaining)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {['cash', 'card', 'transfer', 'qris'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2 rounded-lg border-2 text-sm font-medium ${
                    paymentMethod === method
                      ? 'border-telegram-blue dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-gray-100'
                      : 'border-gray-200 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Jumlah Bayar <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" className="text-lg" />
            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="mt-2 space-y-1 text-sm">
                {parseFloat(paymentAmount) >= remaining ? (
                  <>
                    <div className="text-green-600 dark:text-green-400 font-semibold">✓ Transaksi akan lunas</div>
                    {parseFloat(paymentAmount) > remaining && (
                      <div className="text-gray-600 dark:text-gray-400">Kembalian: {formatCurrency(parseFloat(paymentAmount) - remaining)}</div>
                    )}
                  </>
                ) : (
                  <div className="text-yellow-600 dark:text-yellow-400">
                    Sisa setelah bayar: {formatCurrency(remaining - parseFloat(paymentAmount))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => { onClose(); setPaymentAmount(''); }} className="flex-1">Batal</Button>
            <Button onClick={onSubmit} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0} className="flex-1">Catat Pembayaran</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
