import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

interface TransactionFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  filterDate: string;
  setFilterDate: (v: string) => void;
  filterCustomer: string;
  setFilterCustomer: (v: string) => void;
  filterCashier: string;
  setFilterCashier: (v: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (v: string) => void;
  customers: any[];
  cashiers: any[];
  onSearch: (e: React.FormEvent) => void;
}

export default function TransactionFilters({
  search, setSearch, filterDate, setFilterDate, filterCustomer, setFilterCustomer,
  filterCashier, setFilterCashier, paymentStatusFilter, setPaymentStatusFilter,
  customers, cashiers, onSearch
}: TransactionFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: '', label: 'Semua', activeClass: 'bg-telegram-blue dark:bg-blue-600 text-white', inactiveClass: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' },
            { value: 'unpaid', label: '🔴 Belum Lunas', activeClass: 'bg-red-600 dark:bg-red-700 text-white', inactiveClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' },
            { value: 'partial', label: '🟡 Cicilan', activeClass: 'bg-yellow-600 dark:bg-yellow-700 text-white', inactiveClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' },
            { value: 'paid', label: '🟢 Lunas', activeClass: 'bg-green-600 dark:bg-green-700 text-white', inactiveClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setPaymentStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                paymentStatusFilter === filter.value ? filter.activeClass : filter.inactiveClass
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Cari nomor invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit">
              <Search size={20} className="mr-2" />
              Cari
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                    className="flex-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setFilterDate(yesterday.toISOString().split('T')[0]);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Kemarin
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="flex-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👤 Pelanggan</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
              >
                <option value="">Semua</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">💼 Kasir</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-telegram focus:outline-none focus:ring-2 focus:ring-telegram-blue bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={filterCashier}
                onChange={(e) => setFilterCashier(e.target.value)}
              >
                <option value="">Semua</option>
                {cashiers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
