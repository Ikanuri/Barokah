'use client';

import React, { useRef, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Button } from './ui/Button';
import { X, Printer, Download, Send, Bluetooth, Settings, ChevronDown, ChevronUp, Save, Copy, Image } from 'lucide-react';
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
  notes?: string;
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
    notes?: string;
  };
  settings?: Partial<PrintSettings>;
}

const defaultSettings: PrintSettings = {
  paperWidth: 80,
  storeName: 'TOKO SAYA',
  storeAddress: 'Jl. Raya No. 123, Kota',
  storePhone: '08123456789',
  showLogo: true,
  logoText: '🏪',
  footerText: 'Terima Kasih atas Kunjungan Anda!\nBarang yang sudah dibeli tidak dapat dikembalikan',
  showBarcode: true,
};

const SETTINGS_STORAGE_KEY = 'thermal-print-settings';

export default function ThermalPrintPreview({
  isOpen,
  onClose,
  transaction,
  settings: customSettings
}: ThermalPrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showItemNotes, setShowItemNotes] = useState(true);
  const [showTransactionNotes, setShowTransactionNotes] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Local settings state — initialized from prop, overridden by localStorage
  const [localSettings, setLocalSettings] = useState<PrintSettings>({
    ...defaultSettings,
    ...customSettings,
  });

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveLocalSettings = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localSettings));
      toast.success('✅ Pengaturan nota tersimpan');
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  if (!isOpen) return null;

  if (!transaction || !transaction.items || transaction.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-2">⚠️ Data Transaksi Tidak Lengkap</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Data transaksi tidak dapat ditampilkan. Silakan coba lagi.
          </p>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    );
  }

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    try {
      const printer = getBluetoothPrinter();

      if (!printer.isConnected()) {
        setIsConnecting(true);
        toast.loading('Menghubungkan ke printer Bluetooth...', { id: 'bt-connect' });

        try {
          await printer.connect();
          toast.success(`✅ Terhubung ke ${printer.getDeviceName()}`, { id: 'bt-connect' });
        } catch (connectError: any) {
          setIsConnecting(false);

          if (connectError.message.includes('Tidak dapat menemukan service')) {
            toast.error(
              '❌ Printer tidak kompatibel.\n\nCoba:\n1. Restart printer\n2. Mode pairing\n3. Printer lain',
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

      const receiptData = {
        storeName: localSettings.storeName,
        storeAddress: localSettings.storeAddress,
        storePhone: localSettings.storePhone,
        invoiceNumber: transaction.invoice_number,
        date: new Date(transaction.transaction_date).toLocaleString('id-ID'),
        cashier: transaction.customer?.name || transaction.guest_name || 'Umum',
        items: transaction.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unit: item.productUnit?.unit_name || 'pcs',
          price: item.unitPrice,
          subtotal: item.subtotal,
          notes: showItemNotes ? item.notes : undefined,
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
        transactionNotes: showTransactionNotes ? transaction.notes : undefined,
        footer: localSettings.footerText,
        paperWidth: localSettings.paperWidth,
      };

      toast.loading('Mencetak struk...', { id: 'bt-print' });

      try {
        await printer.printReceipt(receiptData);
        toast.success('✅ Struk berhasil dicetak!', { id: 'bt-print' });
      } catch (printError: any) {
        if (printError.message.includes('not permitted') || printError.message.includes('GATT')) {
          toast.error(
            '❌ Printer menolak print.\nDisconnect → Restart → Connect lagi.\nAtau pakai Print (Browser).',
            { id: 'bt-print', duration: 8000 }
          );
        } else {
          toast.error(`❌ Gagal mencetak: ${printError.message}`, { id: 'bt-print', duration: 5000 });
        }
        await printer.disconnect();
      }

    } catch (error: any) {
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = printRef.current?.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk ${transaction.invoice_number}</title>
          <style>${getPrintStyles()}</style>
        </head>
        <body>
          <div class="thermal-receipt" style="width: ${localSettings.paperWidth}mm;">
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Capture receipt div as JPEG blob using html2canvas
  const captureReceiptImage = async (): Promise<Blob> => {
    if (!printRef.current) throw new Error('Elemen struk tidak ditemukan');

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(printRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Gagal membuat gambar'));
        },
        'image/jpeg',
        0.92
      );
    });
  };

  const handleShareAsImage = async (platform: 'whatsapp' | 'telegram') => {
    setIsSharing(true);
    const toastId = 'share-img';
    try {
      toast.loading('Membuat gambar struk...', { id: toastId });
      const blob = await captureReceiptImage();
      const fileName = `struk_${transaction.invoice_number}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Try Web Share API (Android Chrome, iOS Safari)
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [file],
          title: `Struk ${transaction.invoice_number}`,
        });
        return;
      }

      // Fallback: download the image then open the app
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);

      if (platform === 'whatsapp') {
        toast.success('Gambar didownload. Buka WhatsApp dan kirim gambar tersebut.', { duration: 5000 });
        setTimeout(() => window.open('https://web.whatsapp.com/', '_blank'), 800);
      } else {
        toast.success('Gambar didownload. Buka Telegram dan kirim gambar tersebut.', { duration: 5000 });
        setTimeout(() => window.open('https://web.telegram.org/', '_blank'), 800);
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      if (error.name !== 'AbortError') {
        toast.error(`❌ Gagal: ${error.message}`);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsSharing(true);
    try {
      toast.loading('Membuat gambar...', { id: 'dl-img' });
      const blob = await captureReceiptImage();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `struk_${transaction.invoice_number}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('✅ Gambar struk berhasil didownload!', { id: 'dl-img' });
    } catch (error: any) {
      toast.error(`❌ Gagal: ${error.message}`, { id: 'dl-img' });
    } finally {
      setIsSharing(false);
    }
  };

  const generatePlainText = () => {
    const lines: string[] = [];
    const width = localSettings.paperWidth === 58 ? 32 : 48;
    const paid = Number(transaction.paid_amount) || 0;
    const totalAmt = Number(transaction.total) || 0;
    const computedChange = paid - totalAmt;

    lines.push(centerText(localSettings.storeName, width));
    lines.push(centerText(localSettings.storeAddress, width));
    lines.push(centerText(localSettings.storePhone, width));
    lines.push('='.repeat(width));

    lines.push(`No: ${transaction.invoice_number}`);
    lines.push(`Tanggal: ${new Date(transaction.transaction_date).toLocaleString('id-ID')}`);
    lines.push(`Kasir: ${transaction.customer?.name || transaction.guest_name || 'Umum'}`);
    lines.push('-'.repeat(width));

    transaction.items.forEach(item => {
      const unitName = item.productUnit?.unit_name || 'pcs';
      lines.push(item.product.name);
      const itemLine = `${item.quantity} ${unitName} x ${formatCurrency(item.unitPrice)}`;
      const subtotalStr = formatCurrency(item.subtotal);
      lines.push(itemLine.padEnd(width - subtotalStr.length) + subtotalStr);
      if (showItemNotes && item.notes) {
        lines.push(`  Note: ${item.notes}`);
      }
    });

    lines.push('-'.repeat(width));

    if (showTransactionNotes && transaction.notes) {
      lines.push(`Catatan: ${transaction.notes}`);
      lines.push('-'.repeat(width));
    }

    lines.push(`Subtotal:`.padEnd(width - formatCurrency(transaction.subtotal).length) + formatCurrency(transaction.subtotal));
    if (Number(transaction.discount) > 0) {
      lines.push(`Diskon:`.padEnd(width - formatCurrency(transaction.discount).length) + formatCurrency(transaction.discount));
    }
    if (Number(transaction.tax) > 0) {
      lines.push(`Pajak:`.padEnd(width - formatCurrency(transaction.tax).length) + formatCurrency(transaction.tax));
    }
    lines.push('='.repeat(width));
    lines.push(`TOTAL:`.padEnd(width - formatCurrency(totalAmt).length) + formatCurrency(totalAmt));
    if (paid > 0) {
      lines.push(`Bayar:`.padEnd(width - formatCurrency(paid).length) + formatCurrency(paid));
    }
    if (computedChange > 0) {
      lines.push(`Kembali:`.padEnd(width - formatCurrency(computedChange).length) + formatCurrency(computedChange));
    } else if (paid >= totalAmt) {
      lines.push(`Status:`.padEnd(width - 'LUNAS'.length) + 'LUNAS');
    } else if (paid > 0) {
      lines.push(`Kredit/Kurang:`.padEnd(width - formatCurrency(totalAmt - paid).length) + formatCurrency(totalAmt - paid));
    } else {
      lines.push(`Status:`.padEnd(width - 'Belum Bayar'.length) + 'Belum Bayar');
    }

    lines.push('='.repeat(width));
    lines.push(centerText(localSettings.footerText.split('\n')[0], width));

    return lines.join('\n');
  };

  // Chat-friendly text: no fixed-width padding (proportional fonts in WA/TG don't align with spaces)
  const generateChatText = () => {
    const divider = '─────────────────';
    const paid = Number(transaction.paid_amount) || 0;
    const totalAmt = Number(transaction.total) || 0;
    const computedChange = paid - totalAmt;
    const lines: string[] = [];

    if (localSettings.storeName) lines.push(`🏪 ${localSettings.storeName}`);
    if (localSettings.storeAddress) lines.push(`📍 ${localSettings.storeAddress}`);
    if (localSettings.storePhone) lines.push(`📞 ${localSettings.storePhone}`);
    lines.push(divider);

    lines.push(`🧾 No: ${transaction.invoice_number}`);
    lines.push(`📅 ${new Date(transaction.transaction_date).toLocaleString('id-ID')}`);
    const customerName = transaction.customer?.name || transaction.guest_name;
    if (customerName && customerName !== 'Umum') lines.push(`👤 ${customerName}`);
    lines.push(divider);

    transaction.items.forEach(item => {
      const unitName = item.productUnit?.unit_name || 'pcs';
      lines.push(`• ${item.product.name}`);
      lines.push(`  ${item.quantity} ${unitName} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.subtotal)}`);
      if (showItemNotes && item.notes) lines.push(`  📝 ${item.notes}`);
    });

    lines.push(divider);

    if (showTransactionNotes && transaction.notes) {
      lines.push(`📝 ${transaction.notes}`);
      lines.push(divider);
    }

    const subtotalAmt = Number(transaction.subtotal) || 0;
    if (subtotalAmt !== totalAmt) lines.push(`Subtotal : ${formatCurrency(subtotalAmt)}`);
    if (Number(transaction.discount) > 0) lines.push(`Diskon   : -${formatCurrency(transaction.discount)}`);
    if (Number(transaction.tax) > 0) lines.push(`Pajak    : ${formatCurrency(transaction.tax)}`);
    lines.push(`TOTAL    : ${formatCurrency(totalAmt)}`);

    if (paid > 0) lines.push(`Bayar    : ${formatCurrency(paid)}`);
    if (computedChange > 0) {
      lines.push(`Kembali  : ${formatCurrency(computedChange)}`);
    } else if (paid >= totalAmt) {
      lines.push(`Status   : LUNAS ✓`);
    } else if (paid > 0) {
      lines.push(`Kredit   : ${formatCurrency(totalAmt - paid)}`);
    } else {
      lines.push(`Status   : Belum Bayar`);
    }

    lines.push(divider);
    if (localSettings.footerText) lines.push(localSettings.footerText);

    return lines.join('\n');
  };

  const handleShareTextWA = () => {
    const text = generateChatText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTextTelegram = () => {
    const text = generateChatText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateChatText());
      toast.success('✅ Teks nota disalin!');
    } catch {
      toast.error('❌ Gagal menyalin teks. Coba dari browser yang didukung.');
    }
  };

  const handleCopyImage = async () => {
    setIsSharing(true);
    try {
      toast.loading('Membuat gambar...', { id: 'copy-img' });
      if (!printRef.current) throw new Error('Elemen struk tidak ditemukan');

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error('Gagal membuat gambar')); },
          'image/png'
        );
      });

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        toast.success('✅ Gambar struk disalin ke clipboard! Langsung Ctrl+V / tempel ke chat.', { id: 'copy-img', duration: 4000 });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `struk_${transaction.invoice_number}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Gambar didownload (browser tidak mendukung copy ke clipboard).', { id: 'copy-img', duration: 4000 });
      }
    } catch (error: any) {
      toast.error(`❌ Gagal: ${error.message}`, { id: 'copy-img' });
    } finally {
      setIsSharing(false);
    }
  };

  const centerText = (text: string, width: number) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const getPrintStyles = () => `
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }

    .thermal-receipt {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: white;
      padding: 10px;
    }

    .text-center { text-align: center; }
    .text-bold { font-weight: bold; }
    .text-large { font-size: 16px; }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
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
          {/* Row 1: Print & Download */}
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
            <Button
              onClick={handleDownloadImage}
              disabled={isSharing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download JPG
            </Button>
          </div>

          {/* Row 2: Share */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Share:</span>
            <Button
              onClick={() => handleShareAsImage('whatsapp')}
              disabled={isSharing}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              WA (JPG)
            </Button>
            <Button
              onClick={() => handleShareAsImage('telegram')}
              disabled={isSharing}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm px-3 py-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              TG (JPG)
            </Button>
            <Button
              onClick={handleShareTextWA}
              variant="outline"
              className="flex items-center gap-1.5 text-green-700 border-green-400 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 text-sm px-3 py-1.5"
            >
              WA (Teks)
            </Button>
            <Button
              onClick={handleShareTextTelegram}
              variant="outline"
              className="flex items-center gap-1.5 text-sky-700 border-sky-400 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20 text-sm px-3 py-1.5"
            >
              TG (Teks)
            </Button>
            <Button
              onClick={handleCopyText}
              variant="outline"
              className="flex items-center gap-1.5 text-gray-700 border-gray-400 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 text-sm px-3 py-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Salin Teks
            </Button>
            <Button
              onClick={handleCopyImage}
              disabled={isSharing}
              variant="outline"
              className="flex items-center gap-1.5 text-purple-700 border-purple-400 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 text-sm px-3 py-1.5"
            >
              <Image className="w-3.5 h-3.5" />
              Salin Gambar
            </Button>
          </div>

          {/* Row 3: Print Options */}
          <div className="flex gap-4 items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📝 Opsi Print:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showItemNotes}
                onChange={(e) => setShowItemNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Catatan Item</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTransactionNotes}
                onChange={(e) => setShowTransactionNotes(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Catatan Struk</span>
            </label>
          </div>

          {/* Row 4: Settings toggle */}
          <button
            onClick={() => setShowSettingsPanel(p => !p)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Pengaturan Nota
            {showSettingsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Settings Panel */}
          {showSettingsPanel && (
            <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
              {/* Paper Size */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Ukuran Kertas
                </label>
                <div className="flex gap-2">
                  {([58, 80] as const).map(w => (
                    <button
                      key={w}
                      onClick={() => setLocalSettings(s => ({ ...s, paperWidth: w }))}
                      className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${
                        localSettings.paperWidth === w
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Store Info */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Nama Toko', key: 'storeName' as const },
                  { label: 'Alamat', key: 'storeAddress' as const },
                  { label: 'No. Telepon', key: 'storePhone' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={localSettings[key]}
                      onChange={e => setLocalSettings(s => ({ ...s, [key]: e.target.value }))}
                      className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Footer / Pesan Penutup
                  </label>
                  <textarea
                    value={localSettings.footerText}
                    onChange={e => setLocalSettings(s => ({ ...s, footerText: e.target.value }))}
                    rows={2}
                    className="w-full border dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={localSettings.showLogo}
                    onChange={e => setLocalSettings(s => ({ ...s, showLogo: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Tampilkan Logo
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={localSettings.showBarcode}
                    onChange={e => setLocalSettings(s => ({ ...s, showBarcode: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Tampilkan Barcode
                </label>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={saveLocalSettings}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Print Preview */}
        <div className="p-8 bg-gray-100 dark:bg-gray-900 overflow-x-auto">
          <div
            ref={printRef}
            className="thermal-receipt mx-auto bg-white shadow-lg"
            style={{
              width: `${localSettings.paperWidth}mm`,
              fontFamily: 'monospace',
              fontSize: localSettings.paperWidth === 58 ? '10px' : '12px',
              lineHeight: '1.4',
              padding: '10px'
            }}
          >
            {/* Logo */}
            {localSettings.showLogo && (
              <div className="text-center text-bold text-large mb-2">
                {localSettings.logoText}
              </div>
            )}

            {/* Store Info */}
            <div className="text-center">
              <div className="text-bold" style={{ fontSize: localSettings.paperWidth === 58 ? '12px' : '14px' }}>
                {localSettings.storeName}
              </div>
              <div style={{ fontSize: '10px' }}>{localSettings.storeAddress}</div>
              <div style={{ fontSize: '10px' }}>{localSettings.storePhone}</div>
            </div>

            <div className="divider-solid"></div>

            {/* Transaction Info */}
            <div style={{ fontSize: '10px' }}>
              <div>No: {transaction.invoice_number}</div>
              <div>Tanggal: {new Date(transaction.transaction_date).toLocaleString('id-ID')}</div>
              <div>Kasir: {transaction.customer?.name || transaction.guest_name || 'Umum'}</div>
              <div>Metode: {
                transaction.payment_method === 'cash' ? 'Tunai' :
                transaction.payment_method === 'debit' ? 'Debit' :
                transaction.payment_method === 'credit' ? 'Kredit' :
                transaction.payment_method === 'transfer' ? 'Transfer' : 'E-Wallet'
              }</div>
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
                  <div style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{transaction.notes}</div>
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
              {transaction.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Diskon:</span>
                  <span>-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pajak:</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
              )}
            </div>

            <div className="divider-solid"></div>

            {/* Grand Total */}
            <div style={{ fontSize: localSettings.paperWidth === 58 ? '12px' : '14px' }} className="text-bold">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              {(() => {
                const paid = Number(transaction.paid_amount) || 0;
                const totalAmt = Number(transaction.total) || 0;
                const computedChange = paid - totalAmt;
                return (
                  <>
                    {paid > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                        <span>Bayar:</span>
                        <span>{formatCurrency(paid)}</span>
                      </div>
                    )}
                    {computedChange > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                        <span>Kembali:</span>
                        <span>{formatCurrency(computedChange)}</span>
                      </div>
                    ) : paid >= totalAmt ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                        <span>Status:</span>
                        <span>LUNAS ✓</span>
                      </div>
                    ) : paid > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', color: '#c00' }}>
                        <span>Kredit/Kurang:</span>
                        <span>{formatCurrency(totalAmt - paid)}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', color: '#888' }}>
                        <span>Status:</span>
                        <span>Belum Bayar</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="divider-solid"></div>

            {/* Footer */}
            <div className="text-center" style={{ fontSize: '10px', marginTop: '10px' }}>
              {localSettings.footerText.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>

            {/* Barcode placeholder */}
            {localSettings.showBarcode && (
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
