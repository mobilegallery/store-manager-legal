
export enum View {
  DASHBOARD = 'dashboard',
  SALES = 'sales',
  REPAIR_JOBS = 'repairJobs',
  EXPENSES = 'expenses',
  PARTIES = 'parties',
  ADD_PARTY = 'addParty',
  PARTY_LEDGER = 'partyLedger',
  PURCHASE = 'purchase',
  PAYMENT_IN = 'paymentIn',
  RECORDS = 'records',
  PURCHASE_RETURN = 'purchaseReturn',
  SALES_RETURN = 'salesReturn',
  INVENTORY = 'inventory',
  ADD_ITEM = 'addItem',
  ADD_ITEMS_TO_TRANSACTION = 'addItemsToTransaction',
  CONFIRM_TRANSACTION_ITEMS = 'confirmTransactionItems',
  PRODUCT_TRANSACTION_HISTORY = 'productTransactionHistory',
  BEST_SELLING_PRODUCTS = 'bestSellingProducts',
  SETTINGS = 'settings',
}

export type PartyType = 'customer' | 'supplier' | 'parts';
export type BalanceType = 'debit' | 'credit'; // debit: to receive, credit: to give
export type PaymentMethod = 'cash' | 'check';
export type RecordType = 'sales' | 'repairs' | 'expenses' | 'all_transactions' | 'menu' | 'inventory' | 'tax' | 'purchase_returns' | 'sales_returns' | 'pnl' | 'full_ledger';
export type PurchaseReturnType = 'Return' | 'Debit';
export type SalesReturnType = 'Return' | 'Credit';
export type TransactionType = 'purchase' | 'sale' | 'repair' | 'payment_in' | 'payment_out' | 'purchase_return' | 'sales_return' | 'expense' | 'opening_balance';

export interface InventoryItem {
  id: string;
  name: string;
  imei?: string;
  purchasePrice: number; // rate/unit without tax
  purchasePriceIncTax: number; // rate/unit with tax
  category: string; // Brand e.g., "Mi", "Samsung"
  subCategory: 'Smartphone' | 'Accessories';
  quantity: number; // Stock level
}

export interface TransactionItem {
  itemId?: string; // Optional for custom/non-inventory items
  name: string;
  quantity: number;
  rate: number; // Price per unit for this transaction (exclusive of tax)
  tax: number; // Percentage, e.g., 13
  total: number; // rate * quantity
}

export interface Party {
  id: string;
  type: PartyType;
  name:string;
  contact: string;
  address: string;
  balanceType: BalanceType;
  balanceAmount: number;
  balanceDate: string; // YYYY-MM-DD
  photo?: string | null;
  panNumber?: string;
}

export interface Sale {
  id: string;
  items: TransactionItem[];
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  customerName: string;
  phone: string;
  paid: number;
  due: number;
  date: string; // YYYY-MM-DD
  notes: string;
  photo?: string | null;
  invoiceNumber?: string;
}

export interface RepairJob {
  id: string;
  customerName: string;
  supplier: string;
  problem: string;
  total: number;
  cost: number;
  paid: number;
  profit: number;
  due: number;
  date: string; // YYYY-MM-DD
  notes: string;
  photo?: string | null;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  photo?: string | null;
}

export interface LedgerEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: 'Debit' | 'Credit';
  amount: number;
  partyName: string;
  notes?: string;
  photo?: string | null;
  checkNo?: string;
  originalRecordId?: string; // Links to the source record for editing/deleting
  transactionType: TransactionType;
  invoiceNumber?: string;
}


export interface Purchase {
  id: string;
  items: TransactionItem[];
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  invoiceNumber: string;
  supplierName: string;
  notes: string;
  photo?: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  partyName: string;
  date: string; // YYYY-MM-DD
  description: string;
  method: PaymentMethod;
  checkNo: string;
  notes: string;
  photo?: string | null;
}

export interface PurchaseReturn {
    id: string;
    date: string;
    invoiceNumber: string;
    type: PurchaseReturnType;
    supplierName: string;
    items: TransactionItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    notes: string;
    photo?: string | null;
}

export interface SalesReturn {
    id: string;
    date: string;
    invoiceNumber: string;
    type: SalesReturnType;
    customerName: string;
    items: TransactionItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    notes: string;
    photo?: string | null;
}


export interface PaymentContext {
    recordId: string;
    partyName: string;
    dueAmount: number;
    type: 'sale' | 'repair';
}