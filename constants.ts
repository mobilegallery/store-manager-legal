export const GOOGLE_CLIENT_ID = '287072081481-r8mvglhor7anst0ido16n4f05f4aiup0.apps.googleusercontent.com';
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
import type { Party, Sale, RepairJob, Expense, LedgerEntry, Purchase, Payment, PurchaseReturn, InventoryItem, SalesReturn } from '@/types';

const generateId = (): string => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const initialInventoryItems: InventoryItem[] = [
    { id: generateId(), name: "Mi Redmi 14C (4/128)", purchasePrice: 13207.00, purchasePriceIncTax: 14923.91, category: 'Mi', subCategory: 'Smartphone', quantity: 7 },
    { id: generateId(), name: "Mi Redmi 14C (6/128)", purchasePrice: 14952.00, purchasePriceIncTax: 16895.76, category: 'Mi', subCategory: 'Smartphone', quantity: 3 },
    { id: generateId(), name: "Mi Redmi 14C (8/256)", purchasePrice: 17756.00, purchasePriceIncTax: 20064.28, category: 'Mi', subCategory: 'Smartphone', quantity: 2 },
    { id: generateId(), name: "20w adaptor", purchasePrice: 3570.00, purchasePriceIncTax: 4034.1, category: 'Apple', subCategory: 'Accessories', quantity: 10 },
    { id: generateId(), name: "Oppo A53 (4/64)", purchasePrice: 11215.00, purchasePriceIncTax: 12672.95, category: 'Oppo', subCategory: 'Smartphone', quantity: 8 },
];


export const initialParties: Party[] = [
  { id: generateId(), type: 'supplier', name: 'Parts & Accessories', contact: '123-456-7890', address: '123 Auto Lane', balanceType: 'credit', balanceAmount: 500, balanceDate: '2023-01-15' },
  { id: generateId(), type: 'supplier', name: 'Global Auto Parts', contact: '987-654-3210', address: '456 Gear Street', balanceType: 'credit', balanceAmount: 250, balanceDate: '2023-02-01' },
  { id: generateId(), type: 'customer', name: 'John Doe', contact: '555-123-4567', address: '789 Main Road', balanceType: 'debit', balanceAmount: 150, balanceDate: '2023-03-10' },
  { id: generateId(), type: 'customer', name: 'Jane Smith', contact: '555-987-6543', address: '321 Oak Avenue', balanceType: 'debit', balanceAmount: 45, balanceDate: '2023-03-13' },
  { id: generateId(), type: 'parts', name: 'Tyre Wholesalers', contact: '111-222-3333', address: '777 Rubber Rd', balanceType: 'credit', balanceAmount: 1000, balanceDate: '2023-05-01' },
];

export const initialSales: Sale[] = [];

export const initialRepairJobs: RepairJob[] = [
  { id: generateId(), customerName: 'John Doe', supplier: 'Global Auto Parts', problem: 'Engine check', total: 150, cost: 100, paid: 150, profit: 50, due: 0, date: '2023-03-11', notes: 'Used OEM filter' },
  { id: generateId(), customerName: 'Jane Smith', supplier: 'Parts & Accessories', problem: 'Tire repair', total: 45, cost: 25, paid: 0, profit: 20, due: 45, date: '2023-03-13', notes: 'Patch and balance' },
  { id: generateId(), customerName: 'Bob White', supplier: 'Global Auto Parts', problem: 'Oil leak fix', total: 300, cost: 200, paid: 200, profit: 100, due: 100, date: '2023-04-05', notes: 'Replaced gasket' },
];

export const initialExpenses: Expense[] = [
  { id: generateId(), title: 'Office Supplies', amount: 75, date: '2023-03-05', notes: 'Pens and paper' },
  { id: generateId(), title: 'Rent Payment', amount: 1200, date: '2023-03-01', notes: 'March rent' },
  { id: generateId(), title: 'Lunch with client', amount: 45, date: '2023-03-08', photo: 'https://via.placeholder.com/150', notes: 'Discussed new project' },
];

export const initialLedger: LedgerEntry[] = [
  { id: generateId(), date: '2023-03-01', description: 'Initial Capital', type: 'Credit', amount: 5000, partyName: 'Owner', transactionType: 'opening_balance' },
  { id: generateId(), date: '2023-03-10', description: 'Sale: Oil Change', type: 'Credit', amount: 50, partyName: 'John Doe', transactionType: 'sale' },
  { id: generateId(), date: '2023-03-05', description: 'Expense: Office Supplies', type: 'Debit', amount: 75, partyName: 'N/A', transactionType: 'expense' },
  { id: generateId(), date: '2023-03-15', description: 'Purchase: Engine Parts', type: 'Debit', amount: 250, partyName: 'Global Auto Parts', transactionType: 'purchase' },
  { id: generateId(), date: '2023-03-11', description: 'Repair Job: Engine check', type: 'Credit', amount: 150, partyName: 'John Doe', transactionType: 'repair' },
  { id: generateId(), date: '2023-03-20', description: 'Purchase: Brake Pads', type: 'Debit', amount: 250, partyName: 'Parts & Accessories', transactionType: 'purchase'},
  { id: generateId(), date: '2023-03-15', description: 'Payment to Global Auto Parts', type: 'Debit', amount: 250, partyName: 'Global Auto Parts', transactionType: 'payment_out' },
  { id: generateId(), date: '2023-03-10', description: 'Payment from John Doe', type: 'Credit', amount: 150, partyName: 'John Doe', transactionType: 'payment_in'}
];

export const initialPurchases: Purchase[] = [];

export const initialPaymentOut: Payment[] = [
    { id: generateId(), amount: 100, partyName: 'Utility Company', date: '2023-03-02', description: 'Electricity bill', method: 'cash', checkNo: '', notes: '' },
    { id: generateId(), amount: 250, partyName: 'Global Auto Parts', date: '2023-03-15', description: 'Parts order payment', method: 'check', checkNo: 'CHK12345', notes: '', photo: 'https://via.placeholder.com/150' },
];

export const initialPaymentIn: Payment[] = [
    { id: generateId(), amount: 150, partyName: 'John Doe', date: '2023-03-10', description: 'Payment for oil change', method: 'cash', checkNo: '', notes: '' },
];

export const initialPurchaseReturns: PurchaseReturn[] = [];
export const initialSalesReturns: SalesReturn[] = [];
