import { create } from 'zustand';

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  selling_price: number;
  stock_quantity: number;
  base_unit: string;
  units?: ProductUnit[];
  variants?: ProductVariant[];
  prices?: ProductPrice[]; // Alternative prices
}

interface ProductUnit {
  id: number;
  unit_name: string;
  conversion_value: number;
  selling_price?: number;
}

interface ProductVariant {
  name: string;
  sku_suffix?: string;
  barcode?: string;
  price_adjustment?: number;
}

interface ProductPrice {
  id: number;
  price_type: string;
  price_name: string;
  price: number;
  min_quantity: number;
  is_active: boolean;
  priority: number;
  description?: string;
}

interface CartItem {
  product: Product;
  productUnit?: ProductUnit;
  variant?: ProductVariant;
  selectedPrice?: ProductPrice; // Selected alternative price
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string; // Item notes
}

interface CartState {
  items: CartItem[];
  selectedCustomer: any | null; // Store selected customer for tier pricing
  setSelectedCustomer: (customer: any | null) => void;
  addItem: (product: Product, unit?: ProductUnit, variant?: ProductVariant, quantity?: number, selectedPrice?: ProductPrice) => void;
  removeItem: (productId: number, unitId?: number, variantName?: string) => void;
  updateQuantity: (productId: number, quantity: number, unitId?: number, variantName?: string) => void;
  updatePrice: (productId: number, selectedPrice: ProductPrice, unitId?: number, variantName?: string) => void;
  updateItemPrice: (productId: number, newPrice: number, unitId?: number, variantName?: string) => void;
  updateItemNotes: (productId: number, notes: string, unitId?: number, variantName?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getBestPrice: (product: Product, quantity: number) => ProductPrice | null;
  getBestPriceForCustomer: (product: Product, quantity: number, customer: any | null) => ProductPrice | null;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedCustomer: null,

  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
    
    // Recalculate all item prices based on new customer tier
    const items = get().items;
    if (items.length > 0) {
      const newItems = items.map(item => {
        const bestPrice = get().getBestPriceForCustomer(item.product, item.quantity, customer);
        if (bestPrice && bestPrice.id !== item.selectedPrice?.id) {
          // Recalculate unit price with new tier price
          let newBasePrice = bestPrice.price;
          let newUnitPrice = item.productUnit 
            ? (item.productUnit.selling_price || newBasePrice * item.productUnit.conversion_value)
            : newBasePrice;
          
          if (item.variant && item.variant.price_adjustment) {
            newUnitPrice += item.variant.price_adjustment;
          }
          
          return {
            ...item,
            selectedPrice: bestPrice,
            unitPrice: newUnitPrice,
            subtotal: item.quantity * newUnitPrice
          };
        }
        return item;
      });
      
      set({ items: newItems });
    }
  },

  // Helper: Get best price considering customer tier
  getBestPriceForCustomer: (product, quantity, customer) => {
    if (!product.prices || product.prices.length === 0) {
      return null;
    }

    // Filter active prices that meet minimum quantity requirement
    let eligiblePrices = product.prices.filter(
      p => p.is_active && p.min_quantity <= quantity
    );

    // If customer has a tier, prioritize tier-specific prices
    if (customer && customer.tier) {
      const tierSlug = customer.tier.slug; // bronze, silver, gold, platinum
      
      // First, try to find exact tier match
      const tierPrice = eligiblePrices.find(p => p.price_type === tierSlug);
      if (tierPrice) {
        return tierPrice;
      }
    }

    if (eligiblePrices.length === 0) {
      return null;
    }

    // Sort by price (ascending) then priority (descending)
    const sorted = eligiblePrices.sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price; // Cheapest first
      }
      return b.priority - a.priority; // Higher priority first
    });

    return sorted[0];
  },

  // Helper: Get best price for product based on quantity (without customer)
  getBestPrice: (product, quantity) => {
    return get().getBestPriceForCustomer(product, quantity, null);
  },

  addItem: (product, unit, variant, quantity = 1, selectedPrice) => {
    const items = get().items;
    const customer = get().selectedCustomer;
    
    // Auto-select best price if not provided (considering customer tier)
    let priceToUse = selectedPrice;
    if (!priceToUse && product.prices && product.prices.length > 0) {
      priceToUse = get().getBestPriceForCustomer(product, quantity, customer) || undefined;
    }
    
    // Calculate unit price (cast to number: API may return decimal strings e.g. "14000.00")
    let basePrice = Number(product.selling_price) || 0;

    // Use alternative price if selected
    if (priceToUse) {
      basePrice = Number(priceToUse.price) || 0;
    }

    // Apply unit conversion
    let unitPrice = unit
      ? (Number(unit.selling_price) || basePrice * unit.conversion_value)
      : basePrice;
    
    // Apply variant price adjustment
    if (variant && variant.price_adjustment) {
      unitPrice += variant.price_adjustment;
    }
    
    const existingIndex = items.findIndex(
      item => item.product.id === product.id && 
              item.productUnit?.id === unit?.id &&
              item.variant?.name === variant?.name
    );

    if (existingIndex >= 0) {
      const newItems = [...items];
      const newQuantity = newItems[existingIndex].quantity + quantity;
      
      // Recalculate best price for new quantity (considering customer)
      const newBestPrice = get().getBestPriceForCustomer(product, newQuantity, customer);
      if (newBestPrice && newBestPrice.id !== newItems[existingIndex].selectedPrice?.id) {
        // Price tier changed! Update unit price
        let newBasePrice = newBestPrice.price;
        let newUnitPrice = unit 
          ? (unit.selling_price || newBasePrice * unit.conversion_value)
          : newBasePrice;
        
        if (variant && variant.price_adjustment) {
          newUnitPrice += variant.price_adjustment;
        }
        
        newItems[existingIndex].selectedPrice = newBestPrice;
        newItems[existingIndex].unitPrice = newUnitPrice;
      }
      
      newItems[existingIndex].quantity = newQuantity;
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].unitPrice;
      set({ items: newItems });
    } else {
      set({
        items: [
          ...items,
          {
            product,
            productUnit: unit,
            variant,
            selectedPrice: priceToUse,
            quantity,
            unitPrice,
            subtotal: quantity * unitPrice,
          },
        ],
      });
    }
  },

  removeItem: (productId, unitId, variantName) => {
    set({
      items: get().items.filter(
        item => !(item.product.id === productId && 
                  item.productUnit?.id === unitId &&
                  item.variant?.name === variantName)
      ),
    });
  },

  updateQuantity: (productId, quantity, unitId, variantName) => {
    const items = get().items;
    const customer = get().selectedCustomer;
    const index = items.findIndex(
      item => item.product.id === productId && 
              item.productUnit?.id === unitId &&
              item.variant?.name === variantName
    );

    if (index >= 0) {
      const newItems = [...items];
      const item = newItems[index];
      
      // Check if quantity change triggers different price tier (considering customer)
      const newBestPrice = get().getBestPriceForCustomer(item.product, quantity, customer);
      if (newBestPrice && newBestPrice.id !== item.selectedPrice?.id) {
        // Price tier changed! Recalculate unit price
        let newBasePrice = newBestPrice.price;
        let newUnitPrice = item.productUnit 
          ? (item.productUnit.selling_price || newBasePrice * item.productUnit.conversion_value)
          : newBasePrice;
        
        if (item.variant && item.variant.price_adjustment) {
          newUnitPrice += item.variant.price_adjustment;
        }
        
        item.selectedPrice = newBestPrice;
        item.unitPrice = newUnitPrice;
      }
      
      item.quantity = quantity;
      item.subtotal = quantity * item.unitPrice;
      set({ items: newItems });
    }
  },

  updatePrice: (productId, selectedPrice, unitId, variantName) => {
    const items = get().items;
    const index = items.findIndex(
      item => item.product.id === productId && 
              item.productUnit?.id === unitId &&
              item.variant?.name === variantName
    );

    if (index >= 0) {
      const newItems = [...items];
      const item = newItems[index];
      
      // Recalculate unit price with new selected price
      let newBasePrice = selectedPrice.price;
      let newUnitPrice = item.productUnit 
        ? (item.productUnit.selling_price || newBasePrice * item.productUnit.conversion_value)
        : newBasePrice;
      
      if (item.variant && item.variant.price_adjustment) {
        newUnitPrice += item.variant.price_adjustment;
      }
      
      item.selectedPrice = selectedPrice;
      item.unitPrice = newUnitPrice;
      item.subtotal = item.quantity * newUnitPrice;
      
      set({ items: newItems });
    }
  },

  // Update item price manually (for direct price input)
  updateItemPrice: (productId, newPrice, unitId, variantName) => {
    const items = get().items;
    const index = items.findIndex(
      item => item.product.id === productId && 
              item.productUnit?.id === unitId &&
              item.variant?.name === variantName
    );

    if (index >= 0) {
      const newItems = [...items];
      const item = newItems[index];
      
      item.unitPrice = newPrice;
      item.subtotal = item.quantity * newPrice;
      
      set({ items: newItems });
    }
  },

  // Update item notes
  updateItemNotes: (productId, notes, unitId, variantName) => {
    const items = get().items;
    const index = items.findIndex(
      item => item.product.id === productId && 
              item.productUnit?.id === unitId &&
              item.variant?.name === variantName
    );

    if (index >= 0) {
      const newItems = [...items];
      newItems[index].notes = notes || undefined;
      set({ items: newItems });
    }
  },

  clearCart: () => set({ items: [] }), // Only clear items, keep selectedCustomer

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.subtotal, 0);
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
