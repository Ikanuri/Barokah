'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Save, Bluetooth, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export interface PrinterConfig {
  paperWidth: number; // 58mm or 80mm
  storeName: string;
  storeAddress: string;
  storePhone: string;
  showLogo: boolean;
  logoText: string;
  footerText: string;
  showBarcode: boolean;
  bluetoothEnabled: boolean;
  bluetoothDeviceName: string;
}

const defaultConfig: PrinterConfig = {
  paperWidth: 80,
  storeName: 'TOKO SAYA',
  storeAddress: 'Jl. Raya No. 123, Kota',
  storePhone: '08123456789',
  showLogo: true,
  logoText: '🏪',
  footerText: 'Terima Kasih atas Kunjungan Anda!\nBarang yang sudah dibeli tidak dapat dikembalikan',
  showBarcode: true,
  bluetoothEnabled: false,
  bluetoothDeviceName: '',
};

const STORAGE_KEY = 'printer_config';

export function usePrinterConfig() {
  const [config, setConfig] = useState<PrinterConfig>(defaultConfig);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      } catch {
        // use default config
      }
    }
  }, []);

  const saveConfig = (newConfig: PrinterConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  return { config, saveConfig };
}

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<PrinterConfig>;
}

export default function PrinterSettings({ isOpen, onClose, initialConfig }: PrinterSettingsProps) {
  const { config: savedConfig, saveConfig } = usePrinterConfig();
  const [config, setConfig] = useState<PrinterConfig>({ ...savedConfig, ...initialConfig });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setConfig({ ...savedConfig, ...initialConfig });
  }, [savedConfig, initialConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveConfig(config);
    toast.success('✅ Pengaturan printer disimpan!');
    onClose();
  };

  const handleScanBluetooth = async () => {
    // @ts-ignore - Bluetooth API not in TypeScript types yet
    if (!navigator.bluetooth) {
      toast.error('❌ Browser Anda tidak mendukung Bluetooth API');
      return;
    }

    setIsScanning(true);
    try {
      // @ts-ignore - Bluetooth API not in TypeScript types yet
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Printer service
        optionalServices: ['battery_service']
      });

      setConfig({ ...config, bluetoothDeviceName: device.name || 'Unknown Device', bluetoothEnabled: true });
      toast.success(`✅ Terhubung ke: ${device.name}`);
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        toast.error('❌ Gagal memindai perangkat Bluetooth');
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ⚙️ Pengaturan Printer Thermal
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Paper Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lebar Kertas
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="58"
                  checked={config.paperWidth === 58}
                  onChange={(e) => setConfig({ ...config, paperWidth: 58 })}
                  className="mr-2"
                />
                58mm
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="80"
                  checked={config.paperWidth === 80}
                  onChange={(e) => setConfig({ ...config, paperWidth: 80 })}
                  className="mr-2"
                />
                80mm
              </label>
            </div>
          </div>

          {/* Store Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Toko
              </label>
              <Input
                value={config.storeName}
                onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                placeholder="Nama Toko"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo/Icon (Emoji)
              </label>
              <Input
                value={config.logoText}
                onChange={(e) => setConfig({ ...config, logoText: e.target.value })}
                placeholder="🏪"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alamat Toko
            </label>
            <Input
              value={config.storeAddress}
              onChange={(e) => setConfig({ ...config, storeAddress: e.target.value })}
              placeholder="Jl. Raya No. 123, Kota"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telepon
            </label>
            <Input
              value={config.storePhone}
              onChange={(e) => setConfig({ ...config, storePhone: e.target.value })}
              placeholder="08123456789"
            />
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teks Footer (pisahkan dengan \n untuk baris baru)
            </label>
            <textarea
              value={config.footerText}
              onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Terima kasih..."
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showLogo}
                onChange={(e) => setConfig({ ...config, showLogo: e.target.checked })}
                className="mr-2"
              />
              Tampilkan Logo/Icon
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.showBarcode}
                onChange={(e) => setConfig({ ...config, showBarcode: e.target.checked })}
                className="mr-2"
              />
              Tampilkan Barcode Invoice
            </label>
          </div>

          {/* Bluetooth Settings */}
          <div className="border-t pt-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bluetooth className="w-5 h-5" />
              Koneksi Bluetooth
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.bluetoothEnabled}
                  onChange={(e) => setConfig({ ...config, bluetoothEnabled: e.target.checked })}
                  className="mr-2"
                />
                Aktifkan Print via Bluetooth
              </label>

              {config.bluetoothEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Perangkat
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={config.bluetoothDeviceName}
                        onChange={(e) => setConfig({ ...config, bluetoothDeviceName: e.target.value })}
                        placeholder="Pilih atau scan perangkat..."
                        readOnly
                      />
                      <Button
                        onClick={handleScanBluetooth}
                        disabled={isScanning}
                        variant="outline"
                      >
                        {isScanning ? '🔍 Scanning...' : '🔍 Scan'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ⚠️ Pastikan printer Bluetooth sudah dalam mode pairing
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
