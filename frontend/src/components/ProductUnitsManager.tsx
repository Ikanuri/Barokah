'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';

export interface ProductUnit {
  id?: number;
  unit_name: string;
  conversion_value: number;
  selling_price: number | string;
  barcode?: string;
  order: number;
  unit_type?: 'countable' | 'weight'; // New: tipe unit
}

interface ProductUnitsManagerProps {
  units: ProductUnit[];
  onUnitsChange: (units: ProductUnit[]) => void;
  basePrice: number;
  baseUnit?: string; // New: base unit from product
}

export default function ProductUnitsManager({ units, onUnitsChange, basePrice, baseUnit = 'biji' }: ProductUnitsManagerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState<number | null>(null);

  const addUnit = () => {
    const newUnit: ProductUnit = {
      unit_name: '',
      conversion_value: 1,
      selling_price: '',
      barcode: '',
      order: units.length + 1,
      unit_type: 'countable',
    };
    onUnitsChange([...units, newUnit]);
  };

  const removeUnit = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index);
    // Recalculate order setelah remove
    const reorderedUnits = newUnits.map((unit, idx) => ({
      ...unit,
      order: idx + 1
    }));
    onUnitsChange(reorderedUnits);
  };

  const updateUnit = (index: number, field: keyof ProductUnit, value: any) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    
    // Auto-detect unit type based on unit name
    if (field === 'unit_name') {
      const weightUnits = ['kg', 'kilogram', 'gram', 'ons', 'ton', 'liter', 'ml', 'mililiter'];
      const valueLower = value.toLowerCase().trim();
      
      // Exact match atau word match (tidak pakai substring includes)
      const isWeight = weightUnits.some(wu => {
        // Exact match
        if (valueLower === wu) return true;
        // Match sebagai kata lengkap (dengan spasi/dash)
        const regex = new RegExp(`\\b${wu}\\b`, 'i');
        return regex.test(valueLower);
      });
      
      newUnits[index].unit_type = isWeight ? 'weight' : 'countable';
    }
    
    onUnitsChange(newUnits);
  };

  const handleUnitNameChange = (index: number, value: string) => {
    if (value === 'custom') {
      setShowCustomInput(index);
      setCustomUnitName('');
    } else {
      setShowCustomInput(null);
      updateUnit(index, 'unit_name', value);
    }
  };

  const applyCustomUnitName = (index: number) => {
    if (customUnitName.trim()) {
      updateUnit(index, 'unit_name', customUnitName.trim());
      setShowCustomInput(null);
      setCustomUnitName('');
    }
  };

  const calculateSuggestedPrice = (conversion: number) => {
    return basePrice * conversion;
  };

  return (
    <div className="border-2 border-[var(--separator)] rounded-xl p-4 md:p-5 bg-[var(--fill-tertiary)]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm md:text-base text-[var(--text-primary)]">Satuan Produk</h3>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] truncate">
            Countable & Timbangan (Kg, Ons, Gram, dll)
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            {collapsed ? '👁️ Tampilkan' : '🙈 Sembunyikan'}
          </Button>
          <Button 
            type="button" 
            size="sm" 
            onClick={addUnit}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            <Plus size={14} className="mr-1" />
            Tambah
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3">
          {units.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              Belum ada satuan. Klik "Tambah Satuan" untuk menambahkan.
            </div>
          ) : (
            units.map((unit, index) => (
              <div key={index} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                {/* Mobile: Stack vertically, Desktop: Grid */}
                <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-3 md:items-start">
                  {/* Unit Name */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Satuan *</label>
                    {showCustomInput === index ? (
                      <div className="flex gap-1">
                        <Input
                          type="text"
                          value={customUnitName}
                          onChange={(e) => setCustomUnitName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              applyCustomUnitName(index);
                            }
                          }}
                          placeholder="Ketik satuan..."
                          className="text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => applyCustomUnitName(index)}
                          className="px-3"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <select
                        value={unit.unit_name}
                        onChange={(e) => handleUnitNameChange(index, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="">Pilih...</option>
                        <optgroup label="Countable (Hitungan)">
                          <option value="biji">Biji/Pcs</option>
                          <option value="dus">Dus/Box</option>
                          <option value="slop">Slop</option>
                          <option value="ret">Ret</option>
                          <option value="rek">Rek</option>
                          <option value="karton">Karton</option>
                          <option value="pak">Pak</option>
                          <option value="lusin">Lusin (12)</option>
                          <option value="kodi">Kodi (20)</option>
                          <option value="gross">Gross (144)</option>
                        </optgroup>
                        <optgroup label="Timbangan (Weight)">
                          <option value="kg">Kilogram (Kg)</option>
                          <option value="ons">Ons (100g)</option>
                          <option value="gram">Gram (g)</option>
                          <option value="ton">Ton</option>
                          <option value="liter">Liter (L)</option>
                          <option value="ml">Mililiter (ml)</option>
                        </optgroup>
                        <optgroup label="Lainnya">
                          <option value="custom">✏️ Ketik Manual...</option>
                        </optgroup>
                      </select>
                    )}
                    {unit.unit_type && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {unit.unit_type === 'weight' ? '⚖️ Timbangan' : '🔢 Hitungan'}
                      </p>
                    )}
                  </div>

                  {/* Conversion */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Konversi *
                    </label>
                    <Input
                      type="number"
                      step={unit.unit_type === 'weight' ? '0.001' : '1'}
                      value={unit.conversion_value}
                      onChange={(e) => updateUnit(index, 'conversion_value', parseFloat(e.target.value) || 1)}
                      placeholder="1"
                      min={unit.unit_type === 'weight' ? '0.001' : '1'}
                      required
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      = {unit.unit_type === 'weight' ? 'berapa kg/gram' : `berapa ${baseUnit}`}
                    </p>
                  </div>

                  {/* Selling Price */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Jual</label>
                    <Input
                      type="number"
                      value={unit.selling_price}
                      onChange={(e) => updateUnit(index, 'selling_price', e.target.value)}
                      placeholder={calculateSuggestedPrice(unit.conversion_value).toString()}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      Saran: {calculateSuggestedPrice(unit.conversion_value).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Barcode and Delete Button - Combined on Mobile */}
                  <div className="flex gap-2 md:contents">
                    {/* Barcode */}
                    <div className="flex-1 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                      <Input
                        type="text"
                        value={unit.barcode}
                        onChange={(e) => updateUnit(index, 'barcode', e.target.value)}
                        placeholder="Optional"
                        className="text-sm"
                      />
                    </div>

                    {/* Delete Button */}
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeUnit(index)}
                        className="text-red-600 hover:text-red-800 h-9 px-3"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {units.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 md:p-3 text-xs md:text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-300">💡 Contoh:</p>
              <div className="mt-2 text-blue-800 dark:text-blue-200 space-y-2">
                {/* Mobile: Compact version */}
                <div className="md:hidden space-y-1">
                  <p className="font-medium">Hitungan:</p>
                  <p>• 1 Dus = 24 Biji → Konversi: 24</p>
                  <p className="font-medium mt-2">Timbangan:</p>
                  <p>• 1 Ons = 0.1 Kg → Konversi: 0.1</p>
                  <p className="text-xs mt-2 opacity-75">
                    Tips: Harga kosong = Harga Dasar × Konversi
                  </p>
                </div>
                
                {/* Desktop: Full version */}
                <div className="hidden md:block">
                  <div>
                    <p className="font-medium">Countable (Hitungan):</p>
                    <ul className="mt-1 space-y-1 ml-4">
                      <li>• 1 Dus = 24 Biji → Konversi: 24</li>
                      <li>• 1 Slop = 10 Biji → Konversi: 10</li>
                      <li>• 1 Lusin = 12 Biji → Konversi: 12</li>
                    </ul>
                  </div>
                  <div className="mt-2">
                    <p className="font-medium">Timbangan (Weight):</p>
                    <ul className="mt-1 space-y-1 ml-4">
                      <li>• 1 Kg = 1000 Gram → Konversi: 1</li>
                      <li>• 1 Ons = 100 Gram → Konversi: 0.1</li>
                      <li>• 500 Gram = 0.5 Kg → Konversi: 0.5</li>
                      <li>• Bisa input desimal: 0.25, 0.5, 1.5, dll</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-blue-300 mt-2">
                    <p className="font-medium">Tips:</p>
                    <ul className="mt-1 space-y-1 ml-4">
                      <li>• Harga kosong → Otomatis: Harga Dasar × Konversi</li>
                      <li>• Pilih "Ketik Manual" untuk satuan custom</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
