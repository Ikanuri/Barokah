/**
 * Bluetooth Thermal Printer Utility
 * Direct print to thermal printer via Web Bluetooth API
 * Supports ESC/POS commands for 58mm and 80mm thermal printers
 */

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

export class BluetoothThermalPrinter {
  private device: any = null; // BluetoothDevice
  private characteristic: any = null; // BluetoothRemoteGATTCharacteristic
  private encoder = new TextEncoder();

  /**
   * Scan and connect to Bluetooth printer
   */
  async connect(): Promise<string> {
    try {
      // @ts-ignore - Web Bluetooth API
      if (!navigator.bluetooth) {
        throw new Error('Browser tidak mendukung Web Bluetooth API. Gunakan Chrome, Edge, atau Opera.');
      }

      // Request device - try without filters first (more compatible)
      // @ts-ignore
      this.device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices: true, // Accept any Bluetooth device
        filters: [
          { namePrefix: 'BlueTooth Printer' },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'RPP' },
          { namePrefix: 'MTP' },
          { namePrefix: 'Thermal' },
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Another printer service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial port service (common!)
          '0000ff00-0000-1000-8000-00805f9b34fb', // Generic service
        ]
      });

      if (!this.device.gatt) {
        throw new Error('Device tidak memiliki GATT server');
      }

      console.log('📱 Device selected:', this.device.name);

      // Connect to GATT server
      const server = await this.device.gatt.connect();
      console.log('✅ Connected to GATT server');

      // Try multiple service UUIDs
      const serviceUUIDs = [
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Most common for thermal printers
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '0000ff00-0000-1000-8000-00805f9b34fb',
      ];

      let service = null;
      for (const uuid of serviceUUIDs) {
        try {
          service = await server.getPrimaryService(uuid);
          console.log(`✅ Got printer service: ${uuid}`);
          break;
        } catch (e) {
          console.log(`⏭️ Service ${uuid} not found, trying next...`);
        }
      }

      if (!service) {
        throw new Error('Tidak dapat menemukan service printer. Coba printer lain atau pastikan printer dalam mode pairing.');
      }

      // Get all characteristics and find writable one
      const characteristics = await service.getCharacteristics();
      console.log(`📝 Found ${characteristics.length} characteristics`);

      // Find writable characteristic (with WRITE or WRITE_WITHOUT_RESPONSE property)
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.characteristic = char;
          console.log('✅ Got write characteristic:', char.uuid);
          break;
        }
      }

      if (!this.characteristic) {
        // Fallback: use first characteristic
        this.characteristic = characteristics[0];
        console.log('⚠️ Using first characteristic as fallback:', this.characteristic.uuid);
      }

      if (!this.characteristic) {
        throw new Error('Tidak dapat menemukan characteristic untuk menulis data');
      }

      return this.device.name || 'Bluetooth Printer';
    } catch (error: any) {
      console.error('❌ Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
      console.log('🔌 Disconnected from printer');
    }
  }

  /**
   * Send raw data to printer
   */
  private async sendRaw(data: string | Uint8Array) {
    if (!this.characteristic) {
      throw new Error('Printer tidak terhubung. Silakan connect terlebih dahulu.');
    }

    const bytes = typeof data === 'string' ? this.encoder.encode(data) : data;
    
    // Determine write method
    const useWriteWithoutResponse = this.characteristic.properties.writeWithoutResponse;
    const useWrite = this.characteristic.properties.write;

    if (!useWriteWithoutResponse && !useWrite) {
      throw new Error('Characteristic tidak mendukung write operation');
    }

    // Split into chunks (max 20 bytes for maximum compatibility)
    // Some printers need smaller chunks
    const chunkSize = 20;
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      
      try {
        if (useWriteWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        
        // Small delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`❌ Failed to write chunk at position ${i}:`, error);
        throw error;
      }
    }
  }

  /**
   * Initialize printer
   */
  private async init() {
    await this.sendRaw(ESC + '@'); // Initialize printer
  }

  /**
   * Set text alignment
   */
  private async setAlign(align: 'left' | 'center' | 'right') {
    const alignCode = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    await this.sendRaw(ESC + 'a' + String.fromCharCode(alignCode));
  }

  /**
   * Set text size
   */
  private async setTextSize(width: number = 1, height: number = 1) {
    const size = ((width - 1) << 4) | (height - 1);
    await this.sendRaw(GS + '!' + String.fromCharCode(size));
  }

  /**
   * Set bold text
   */
  private async setBold(bold: boolean) {
    await this.sendRaw(ESC + 'E' + (bold ? '\x01' : '\x00'));
  }

  /**
   * Print text
   */
  private async printText(text: string) {
    await this.sendRaw(text);
  }

  /**
   * Print line
   */
  private async printLine(text: string = '') {
    await this.sendRaw(text + '\n');
  }

  /**
   * Print separator line
   */
  private async printSeparator(char: string = '-', width: number = 48) {
    await this.printLine(char.repeat(width));
  }

  /**
   * Feed paper (line breaks)
   */
  private async feed(lines: number = 1) {
    await this.sendRaw('\n'.repeat(lines));
  }

  /**
   * Cut paper
   */
  private async cut() {
    await this.sendRaw(GS + 'V' + '\x00'); // Full cut
    // Partial cut alternative: GS + 'V' + '\x01'
  }

  /**
   * Print receipt
   */
  async printReceipt(data: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    invoiceNumber: string;
    date: string;
    cashier: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      price: number;
      subtotal: number;
      notes?: string; // ✅ Add notes field
    }>;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paid: number;
    change: number;
    paymentMethod: string;
    transactionNotes?: string; // ✅ Add transaction notes
    footer?: string;
    paperWidth?: number; // 58 or 80 (mm)
  }) {
    try {
      const width = data.paperWidth === 58 ? 32 : 48;

      // Initialize
      await this.init();

      // Header - Store name (large, centered, bold)
      await this.setAlign('center');
      await this.setTextSize(2, 2);
      await this.setBold(true);
      await this.printLine(data.storeName);

      // Store details (normal size, centered)
      await this.setTextSize(1, 1);
      await this.setBold(false);
      await this.printLine(data.storeAddress);
      await this.printLine(data.storePhone);

      await this.printSeparator('=', width);

      // Transaction info (left aligned)
      await this.setAlign('left');
      await this.printLine(`No: ${data.invoiceNumber}`);
      await this.printLine(`Tanggal: ${data.date}`);
      await this.printLine(`Kasir: ${data.cashier}`);
      await this.printLine(`Pembayaran: ${data.paymentMethod}`);

      await this.printSeparator('-', width);

      // Items
      for (const item of data.items) {
        // Product name (bold)
        await this.setBold(true);
        await this.printLine(item.name);
        
        // Quantity x Price = Subtotal
        await this.setBold(false);
        const qtyLine = `${item.quantity} ${item.unit} x ${this.formatCurrency(item.price)}`;
        const subtotalStr = this.formatCurrency(item.subtotal);
        const spacing = width - qtyLine.length - subtotalStr.length;
        await this.printLine(qtyLine + ' '.repeat(Math.max(0, spacing)) + subtotalStr);
        
        // Item notes (if any)
        if (item.notes) {
          await this.printLine(`  Note: ${item.notes}`);
        }
      }

      await this.printSeparator('-', width);

      // Transaction notes (if any)
      if (data.transactionNotes) {
        await this.setBold(true);
        await this.printLine('CATATAN:');
        await this.setBold(false);
        await this.printLine(data.transactionNotes);
        await this.printSeparator('-', width);
      }

      // Totals (right aligned values)
      await this.printLine(this.formatRow('Subtotal:', this.formatCurrency(data.subtotal), width));
      
      if (data.discount && data.discount > 0) {
        await this.printLine(this.formatRow('Diskon:', '-' + this.formatCurrency(data.discount), width));
      }
      
      if (data.tax && data.tax > 0) {
        await this.printLine(this.formatRow('Pajak:', this.formatCurrency(data.tax), width));
      }

      await this.printSeparator('=', width);

      // Grand total (bold, larger)
      await this.setBold(true);
      await this.setTextSize(2, 1);
      await this.printLine(this.formatRow('TOTAL:', this.formatCurrency(data.total), width));

      await this.setTextSize(1, 1);
      await this.printLine(this.formatRow('Bayar:', this.formatCurrency(data.paid), width));
      await this.printLine(this.formatRow('Kembali:', this.formatCurrency(data.change), width));
      await this.setBold(false);

      await this.printSeparator('=', width);

      // Footer (centered)
      await this.setAlign('center');
      if (data.footer) {
        const footerLines = data.footer.split('\n');
        for (const line of footerLines) {
          await this.printLine(line);
        }
      }

      // Barcode (invoice number)
      await this.printBarcode(data.invoiceNumber);

      // Feed and cut
      await this.feed(3);
      await this.cut();

      console.log('✅ Receipt printed successfully');
    } catch (error) {
      console.error('❌ Print error:', error);
      throw error;
    }
  }

  /**
   * Print barcode (CODE128)
   */
  private async printBarcode(text: string) {
    try {
      // Set barcode height
      await this.sendRaw(GS + 'h' + String.fromCharCode(60)); // 60 dots height
      
      // Set barcode width
      await this.sendRaw(GS + 'w' + String.fromCharCode(2)); // Width 2
      
      // Print barcode text below
      await this.sendRaw(GS + 'H' + String.fromCharCode(2)); // Position below
      
      // Set font for barcode text
      await this.sendRaw(GS + 'f' + String.fromCharCode(0)); // Font A
      
      // Print CODE128 barcode
      await this.sendRaw(GS + 'k' + String.fromCharCode(73)); // CODE128
      await this.sendRaw(String.fromCharCode(text.length)); // Length
      await this.sendRaw(text); // Data
    } catch (error) {
      console.warn('Barcode print failed:', error);
      // Continue even if barcode fails
    }
  }

  /**
   * Format currency (Rupiah)
   */
  private formatCurrency(amount: number): string {
    return 'Rp' + amount.toLocaleString('id-ID');
  }

  /**
   * Format row with label and value
   */
  private formatRow(label: string, value: string, width: number): string {
    const spacing = width - label.length - value.length;
    return label + ' '.repeat(Math.max(1, spacing)) + value;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.device?.gatt?.connected || false;
  }

  /**
   * Get device name
   */
  getDeviceName(): string {
    return this.device?.name || 'Unknown';
  }
}

// Singleton instance
let printerInstance: BluetoothThermalPrinter | null = null;

export function getBluetoothPrinter(): BluetoothThermalPrinter {
  if (!printerInstance) {
    printerInstance = new BluetoothThermalPrinter();
  }
  return printerInstance;
}
