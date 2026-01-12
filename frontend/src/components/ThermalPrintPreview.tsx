'use client';

import React, { useRef, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Button } from './ui/Button';
import { X, Printer, Download, Send, Bluetooth } from 'lucide-react';
import { getBluetoothPrinter } from '@/lib/bluetoothPrinter';
import toast from 'react-hot-toast';

interface PrintSettings {
  paperWidth: number; // in mm (58mm or 80mm)
  storeName: string;
  storeAddress: string;
  storePhone: string;
  showLogo: boolean;
  logoText: string;
  footerText: string;
  showBarcode: boolean;
}

interface TransactionItem {
  product: {
    name: string;
    sku?: string;
  };
  productUnit?: {
    unit_name: string;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string; // ✅ Add notes field
}

interface ThermalPrintPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    invoice_number: string;
    transaction_date: string;
    items: TransactionItem[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paid_amount: number;
    change: number;
    payment_method: string;
    payment_status: string;
    customer?: {
      name: string;
    };
    guest_name?: string;
    notes?: string; // ✅ Add transaction notes field
  };
  settings?: Partial<PrintSettings>;
}

const defaultSettings: PrintSettings = {
  paperWidth: 80, // 80mm default
  storeName: 'TOKO SAYA',
  storeAddress: 'Jl. Raya No. 123, Kota',
  storePhone: '08123456789',
  showLogo: true,
  logoText: '🏪',
  footerText: 'Terima Kasih atas Kunjungan Anda!\nBarang yang sudah dibeli tidak dapat dikembalikan',
  showBarcode: true,
};

export default function ThermalPrintPreview({ 
  isOpen, 
  onClose, 
  transaction,
  settings: customSettings 
}: ThermalPrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const settings = { ...defaultSettings, ...customSettings };
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // State untuk toggle print notes
  const [showItemNotes, setShowItemNotes] = useState(true);
  const [showTransactionNotes, setShowTransactionNotes] = useState(true);

  if (!isOpen) return null;

  // Safety check: ensure transaction has required data
  if (!transaction || !transaction.items || transaction.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-bold mb-2">⚠️ Data Transaksi Tidak Lengkap</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Data transaksi tidak dapat ditampilkan. Silakan coba lagi.
          </p>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    );
  }

  const handleDisconnect = async () => {
    try {
      const printer = getBluetoothPrinter();
      await printer.disconnect();
      toast.success('✅ Printer berhasil di-disconnect');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    try {
      const printer = getBluetoothPrinter();
      
      // Connect if not connected
      if (!printer.isConnected()) {
        setIsConnecting(true);
        toast.loading('Menghubungkan ke printer Bluetooth...', { id: 'bt-connect' });
        
        try {
          await printer.connect();
          toast.success(`✅ Terhubung ke ${printer.getDeviceName()}`, { id: 'bt-connect' });
        } catch (connectError: any) {
          setIsConnecting(false);
          
          // Specific error messages
          if (connectError.message.includes('Tidak dapat menemukan service')) {
            toast.error(
              '❌ Printer tidak kompatibel.\n\n' +
              'Coba:\n' +
              '1. Restart printer (matikan → nyalakan)\n' +
              '2. Pastikan printer dalam mode pairing\n' +
              '3. Coba printer thermal lain', 
              { id: 'bt-connect', duration: 6000 }
            );
          } else if (connectError.name === 'NotFoundError') {
            toast.error('❌ Tidak ada printer yang dipilih', { id: 'bt-connect' });
          } else {
            toast.error(`❌ Gagal koneksi: ${connectError.message}`, { id: 'bt-connect', duration: 5000 });
          }
          
          setIsPrinting(false);
          return;
        }
        
        setIsConnecting(false);
      }

      // Prepare receipt data
      const receiptData = {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        invoiceNumber: transaction.invoice_number,
        date: new Date(transaction.transaction_date).toLocaleString('id-ID'),
        cashier: transaction.customer?.name || transaction.guest_name || 'Umum',
        items: transaction.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unit: item.productUnit?.unit_name || 'pcs',
          price: item.unitPrice,
          subtotal: item.subtotal,
          notes: showItemNotes ? item.notes : undefined, // ✅ Only if toggle enabled
        })),
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        tax: transaction.tax,
        total: transaction.total,
        paid: transaction.paid_amount,
        change: transaction.change,
        paymentMethod: transaction.payment_method === 'cash' ? 'Tunai' : 
                       transaction.payment_method === 'debit' ? 'Debit' : 
                       transaction.payment_method === 'credit' ? 'Kredit' : 
                       transaction.payment_method === 'transfer' ? 'Transfer' : 'E-Wallet',
        transactionNotes: showTransactionNotes ? transaction.notes : undefined, // ✅ Only if toggle enabled
        footer: settings.footerText,
        paperWidth: settings.paperWidth,
      };

      toast.loading('Mencetak struk...', { id: 'bt-print' });
      
      try {
        await printer.printReceipt(receiptData);
        toast.success('✅ Struk berhasil dicetak!', { id: 'bt-print' });
      } catch (printError: any) {
        console.error('Print error:', printError);
        
        if (printError.message.includes('not permitted') || printError.message.includes('GATT')) {
          toast.error(
            '❌ Printer menolak perintah print.\n\n' +
            'Solusi:\n' +
            '1. Disconnect printer\n' +
            '2. Restart printer\n' +
            '3. Refresh halaman\n' +
            '4. Connect & print lagi\n\n' +
            'Atau gunakan "Print (Browser)" sebagai alternatif.', 
            { id: 'bt-print', duration: 8000 }
          );
        } else {
          toast.error(`❌ Gagal mencetak: ${printError.message}`, { id: 'bt-print', duration: 5000 });
        }
        
        // Auto disconnect on error
        await printer.disconnect();
      }

    } catch (error: any) {
      console.error('Bluetooth print error:', error);
      toast.error(`❌ Error: ${error.message}`, { id: 'bt-print' });
    } finally {
      setIsPrinting(false);
      setIsConnecting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Using browser's print to PDF functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = printRef.current?.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk ${transaction.invoice_number}</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          <div class="thermal-receipt" style="width: ${settings.paperWidth}mm;">
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShareWhatsApp = () => {
    const text = generatePlainText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const text = generatePlainText();
    const url = `https://t.me/share/url?url=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const generatePlainText = () => {
    const lines = [];
    const width = settings.paperWidth === 58 ? 32 : 48;
    
    // Header
    lines.push(centerText(settings.storeName, width));
    lines.push(centerText(settings.storeAddress, width));
    lines.push(centerText(settings.storePhone, width));
    lines.push('='.repeat(width));
    
    // Transaction Info
    lines.push(`No: ${transaction.invoice_number}`);
    lines.push(`Tanggal: ${new Date(transaction.transaction_date).toLocaleString('id-ID')}`);
    lines.push(`Kasir: ${transaction.customer?.name || transaction.guest_name || 'Umum'}`);
    lines.push('-'.repeat(width));
    
    // Items
    transaction.items.forEach(item => {
      const unitName = item.productUnit?.unit_name || 'pcs';
      lines.push(item.product.name);
      const itemLine = `${item.quantity} ${unitName} x ${formatCurrency(item.unitPrice)}`;
      const subtotalStr = formatCurrency(item.subtotal);
      lines.push(itemLine.padEnd(width - subtotalStr.length) + subtotalStr);
    });
    
    lines.push('-'.repeat(width));
    
    // Totals
    lines.push(`Subtotal:`.padEnd(width - formatCurrency(transaction.subtotal).length) + formatCurrency(transaction.subtotal));
    if (transaction.discount) {
      lines.push(`Diskon:`.padEnd(width - formatCurrency(transaction.discount).length) + formatCurrency(transaction.discount));
    }
    if (transaction.tax) {
      lines.push(`Pajak:`.padEnd(width - formatCurrency(transaction.tax).length) + formatCurrency(transaction.tax));
    }
    lines.push('='.repeat(width));
    lines.push(`TOTAL:`.padEnd(width - formatCurrency(transaction.total).length) + formatCurrency(transaction.total));
    lines.push(`Bayar:`.padEnd(width - formatCurrency(transaction.paid_amount).length) + formatCurrency(transaction.paid_amount));
    lines.push(`Kembali:`.padEnd(width - formatCurrency(transaction.change).length) + formatCurrency(transaction.change));
    
    lines.push('='.repeat(width));
    lines.push(centerText(settings.footerText.split('\n')[0], width));
    
    return lines.join('\n');
  };

  const centerText = (text: string, width: number) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const getPrintStyles = () => `
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    
    .thermal-receipt {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: white;
      padding: 10px;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-bold {
      font-weight: bold;
    }
    
    .text-large {
      font-size: 16px;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    
    .divider-solid {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
  `;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 no-print">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            🧾 Print Preview - Struk Thermal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b dark:border-gray-700 no-print space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleBluetoothPrint} 
              disabled={isPrinting || isConnecting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Bluetooth className="w-4 h-4" />
              {isConnecting ? 'Menghubungkan...' : isPrinting ? 'Mencetak...' : 'Print Bluetooth'}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print (Browser)
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button onClick={handleShareWhatsApp} variant="outline" className="flex items-center gap-2 bg-green-500 text-white hover:bg-green-600">
              <Send className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button onClick={handleShareTelegram} variant="outline" className="flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600">
              <Send className="w-4 h-4" />
              Telegram
            </Button>
          </div>
          
          {/* Toggle Notes Options */}
          <div className="flex gap-4 items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📝 Opsi Print:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showItemNotes}
                onChange={(e) => setShowItemNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Catatan Item</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTransactionNotes}
                onChange={(e) => setShowTransactionNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Catatan Struk</span>
            </label>
          </div>
        </div>

        {/* Print Preview */}
        <div className="p-8 bg-gray-100 dark:bg-gray-900 overflow-x-auto">
          <div 
            ref={printRef}
            className="thermal-receipt mx-auto bg-white shadow-lg"
            style={{ 
              width: `${settings.paperWidth}mm`,
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.4',
              padding: '10px'
            }}
          >
            {/* Logo/Store Name */}
            {settings.showLogo && (
              <div className="text-center text-bold text-large mb-2">
                {settings.logoText}
              </div>
            )}
            
            {/* Store Info */}
            <div className="text-center">
              <div className="text-bold" style={{ fontSize: '14px' }}>{settings.storeName}</div>
              <div style={{ fontSize: '10px' }}>{settings.storeAddress}</div>
              <div style={{ fontSize: '10px' }}>{settings.storePhone}</div>
            </div>

            <div className="divider-solid"></div>

            {/* Transaction Info */}
            <div style={{ fontSize: '10px' }}>
              <div>No: {transaction.invoice_number}</div>
              <div>Tanggal: {new Date(transaction.transaction_date).toLocaleString('id-ID')}</div>
              <div>Kasir: {transaction.customer?.name || transaction.guest_name || 'Umum'}</div>
              <div>Metode: {transaction.payment_method === 'cash' ? 'Tunai' : 
                           transaction.payment_method === 'debit' ? 'Debit' : 
                           transaction.payment_method === 'credit' ? 'Kredit' : 
                           transaction.payment_method === 'transfer' ? 'Transfer' : 'E-Wallet'}</div>
            </div>

            <div className="divider"></div>

            {/* Items */}
            <div>
              {transaction.items.map((item, idx) => {
                const unitName = item.productUnit?.unit_name || 'pcs';
                return (
                  <div key={idx} style={{ marginBottom: '8px', fontSize: '11px' }}>
                    <div className="text-bold">{item.product.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.quantity} {unitName} x {formatCurrency(item.unitPrice)}</span>
                      <span className="text-bold">{formatCurrency(item.subtotal)}</span>
                    </div>
                    {showItemNotes && item.notes && (
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                        📝 {item.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="divider"></div>

            {/* Transaction Notes */}
            {showTransactionNotes && transaction.notes && (
              <>
                <div style={{ fontSize: '11px', marginBottom: '8px', padding: '6px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                  <div className="text-bold" style={{ marginBottom: '4px' }}>📝 Catatan:</div>
                  <div style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                    {transaction.notes}
                  </div>
                </div>
                <div className="divider"></div>
              </>
            )}

            {/* Totals */}
            <div style={{ fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discount && transaction.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Diskon:</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax && transaction.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pajak:</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
              )}
            </div>

            <div className="divider-solid"></div>

            {/* Grand Total */}
            <div style={{ fontSize: '14px' }} className="text-bold">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                <span>Bayar:</span>
                <span>{formatCurrency(transaction.paid_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                <span>Kembali:</span>
                <span>{formatCurrency(transaction.change)}</span>
              </div>
            </div>

            <div className="divider-solid"></div>

            {/* Footer */}
            <div className="text-center" style={{ fontSize: '10px', marginTop: '10px' }}>
              {settings.footerText.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>

            {/* Barcode placeholder */}
            {settings.showBarcode && (
              <div className="text-center" style={{ marginTop: '10px', fontSize: '10px' }}>
                <div style={{ 
                  height: '40px', 
                  background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)',
                  margin: '0 auto',
                  width: '80%'
                }}></div>
                <div style={{ marginTop: '4px' }}>{transaction.invoice_number}</div>
              </div>
            )}
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          ${getPrintStyles()}
        `}</style>
      </div>
    </div>
  );
}
