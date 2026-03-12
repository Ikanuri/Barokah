import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mic, Barcode } from 'lucide-react';

interface ProductSearchBarProps {
  search: string;
  onSearchChange: (value: string, autoAdd: boolean) => void;
  onPageReset: () => void;
  onVoiceSearch: () => void;
  isListening: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export default function ProductSearchBar({ search, onSearchChange, onPageReset, onVoiceSearch, isListening, searchInputRef }: ProductSearchBarProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg md:text-xl font-bold dark:text-gray-100">Cari Produk</h2>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Cari produk atau scan barcode"
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value, false);
                onPageReset();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  e.preventDefault();
                  onSearchChange(search, true);
                }
              }}
              className="text-sm md:text-lg"
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={onVoiceSearch}
            title="Voice Search"
            className={`flex-shrink-0 ${isListening ? 'animate-pulse bg-red-100 border-red-500' : ''}`}
            disabled={isListening}
          >
            <Mic size={20} className={isListening ? 'text-red-600' : ''} />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {/* Implement barcode scanner */}}
            title="Scan Barcode"
            className="flex-shrink-0"
          >
            <Barcode size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
