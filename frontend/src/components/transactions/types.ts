export interface Transaction {
  id: number;
  invoice_number: string;
  date: string;
  total: number;
  payment_method: string;
  payment_status?: string;
  payment_amount: number;
  paid_total?: number;
  change: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  } | null;
  guest_name?: string | null;
  cashier: {
    name: string;
  };
  items_count: number;
  status?: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: number;
  product_id?: number;
  product_unit_id?: number | null;
  product_name: string;
  unit_name?: string;
  variant_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface DateGroup {
  date: string;
  dateFormatted: string;
  transactions: Transaction[];
  totalAmount: number;
  count: number;
}
