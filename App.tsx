



import React, { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { Home, ShoppingBag, UserPlus, Search, Edit, Plus, ReceiptText, ArrowUpCircle, ArrowDownCircle, DollarSign, Trash2, Filter, Calculator, Camera, Wrench, Book, Moon, Sun, MoreVertical, ArrowLeft, ChevronDown, ChevronUp, Printer, RefreshCw, Package, ScanLine, X, FileText, CheckCircle, Minus, Check, Download, Share2, FileSpreadsheet, Laptop, Settings, LogOut, KeyRound, Link, Smartphone, Lock, Save, Database, AlertTriangle } from 'lucide-react';
import NepaliDate from 'nepali-date-converter';
import { View, PartyType, BalanceType, PaymentMethod, Party, Sale, RepairJob, Expense, LedgerEntry, Purchase, Payment, RecordType, PurchaseReturn, PurchaseReturnType, SalesReturnType, SalesReturn, PaymentContext, TransactionType, InventoryItem, TransactionItem } from '@/types';
import { initialParties, initialSales, initialRepairJobs, initialExpenses, initialLedger, initialPurchases, initialPaymentIn, initialPaymentOut, initialPurchaseReturns, initialInventoryItems, initialSalesReturns } from '@/constants';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend, ChartOptions, ChartData } from 'chart.js';

declare var gapi: any;
declare var google: any;

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

// --- Google Drive API & Persistence Configuration ---
// ⚠️ URGENT SECURITY WARNING: The keys you have been using are now public and compromised.
// You MUST delete them from your Google Cloud Console and create NEW ones.
// Paste your NEW credentials below, ensuring they are inside the quotes and on a single line.
const CLIENT_ID = '287072081481-r8mvglhor7anst0ido16n4f05f4aiup0.apps.googleusercontent.com'; // <--- PASTE YOUR NEW CLIENT ID HERE
const API_KEY = 'AIzaSyDAi6yM71nNWjUUn9QXOoN2ivML8cPSWp0';   // <--- PASTE YOUR NEW API KEY HERE


const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DATA_FILE_NAME = 'business-manager-pro-data.json';

const formatDate = (gregorianDateString?: string): string => {
  if (!gregorianDateString) return '';
  try {
    const parts = gregorianDateString.split('-');
    if (parts.length !== 3) return gregorianDateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const gregDate = new Date(year, month - 1, day);
    if (isNaN(gregDate.getTime())) return gregorianDateString;
    
    const nepaliDate = new NepaliDate(gregDate);
    return nepaliDate.format('DD MMMM, YYYY');
  } catch (e) {
    console.error("Error converting to Nepali date:", e);
    return gregorianDateString;
  }
};

const generateId = (): string => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const transactionTypeDisplayMap: { [key in TransactionType | 'party']: string } = {
    'purchase': 'Purchase',
    'sale': 'Sale',
    'repair': 'Repair',
    'payment_in': 'Payment In',
    'payment_out': 'Payment Out',
    'purchase_return': 'Purchase Return',
    'sales_return': 'Sales Return',
    'expense': 'Expense',
    'opening_balance': 'Opening Balance',
    'party': 'Party'
};

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const DashboardChart = ({ totals, theme }: { totals: any; theme: string }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJS | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;
            
            const isDark = theme !== 'light';

            const data: ChartData<'bar'> = {
                labels: ['Sales', 'Purchases', 'Repairs', 'Expenses'],
                datasets: [
                    {
                        label: 'Total Amount',
                        data: [totals.sales, totals.purchases, totals.repairJobs, totals.expenses],
                        backgroundColor: [
                            '#3b82f6',
                            '#f59e0b',
                            '#22c55e',
                            '#ef4444',
                        ],
                        borderColor: [
                           '#3b82f6',
                           '#f59e0b',
                           '#22c55e',
                           '#ef4444',
                        ],
                        borderWidth: 1,
                        barPercentage: 0.5,
                        categoryPercentage: 0.7,
                    },
                ],
            };

            const options: ChartOptions<'bar'> = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Business Overview', color: isDark ? '#f3f4f6' : '#1f2937', font: { size: 16 } },
                },
                scales: {
                    x: {
                        ticks: { display: true, color: isDark ? '#9ca3af' : '#4b5563' },
                        grid: { display: false },
                        border: { display: false }
                    },
                    y: {
                        ticks: { color: isDark ? '#9ca3af' : '#4b5563' },
                        grid: { color: isDark ? '#374151' : '#e5e7eb' },
                        border: { display: false }
                    },
                },
            };

            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            chartInstance.current = new ChartJS(ctx, {
                type: 'bar',
                data: data,
                options: options,
            });
        }
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [totals, theme]);

    return (
        <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md mb-4 h-48">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};


export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [previousView, setPreviousView] = useState<View>(View.DASHBOARD);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [viewMode, setViewMode] = useState<'pc' | 'mobile'>('mobile');

  // --- New state for GDrive, PIN, and status ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isLoggedInToGoogle, setIsLoggedInToGoogle] = useState(false);
  const [gdriveFileId, setGdriveFileId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState('Initializing...');
  const [showSyncPopup, setShowSyncPopup] = useState(false);

  const [isPinSet, setIsPinSet] = useState(false);
  const [showPinLockScreen, setShowPinLockScreen] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showPinDeleteConfirm, setShowPinDeleteConfirm] = useState(false);


  // Data states
  const [parties, setParties] = useState<Party[]>([]);
  const [salesRecords, setSalesRecords] = useState<Sale[]>([]);
  const [repairJobsRecords, setRepairJobsRecords] = useState<RepairJob[]>([]);
  const [expensesRecords, setExpensesRecords] = useState<Expense[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<LedgerEntry[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<Purchase[]>([]);
  const [paymentInRecords, setPaymentInRecords] = useState<Payment[]>([]);
  const [paymentOutRecords, setPaymentOutRecords] = useState<Payment[]>([]);
  const [purchaseReturnRecords, setPurchaseReturnRecords] = useState<PurchaseReturn[]>([]);
  const [salesReturnRecords, setSalesReturnRecords] = useState<SalesReturn[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  
  // Selection and Modal states
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [activeRecordView, setActiveRecordView] = useState<RecordType>('menu');
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null);
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Set<string>>(new Set());
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ recordId: string; type: TransactionType | 'party' | 'inventory' } | null>(null);
  const [showPostTransactionPopup, setShowPostTransactionPopup] = useState<{type: 'sale' | 'purchase', id: string} | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadContext, setDownloadContext] = useState<{ data: any[]; headers: string[]; title: string; csvFormatter: (data: any[]) => any[][] } | null>(null);
  
  // Editing states
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingRepairId, setEditingRepairId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingPaymentOutId, setEditingPaymentOutId] = useState<string | null>(null);
  const [editingPaymentInId, setEditingPaymentInId] = useState<string | null>(null);
  const [editingPurchaseReturnId, setEditingPurchaseReturnId] = useState<string | null>(null);
  const [editingSalesReturnId, setEditingSalesReturnId] = useState<string | null>(null);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);


  // Form states - General
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Party form
  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [partyName, setPartyName] = useState('');
  const [partyContact, setPartyContact] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyPanNumber, setPartyPanNumber] = useState('');
  const [partyBalanceType, setPartyBalanceType] = useState<BalanceType>('debit');
  const [partyBalanceAmount, setPartyBalanceAmount] = useState('');
  const [partyBalanceDate, setPartyBalanceDate] = useState(today);

  // Transaction forms (Sale, Purchase, Returns)
  const [currentTransactionItems, setCurrentTransactionItems] = useState<TransactionItem[]>([]);
  const [currentTransactionType, setCurrentTransactionType] = useState<'sale'|'purchase'|'purchase_return'|'sales_return'|null>(null);
  const [addItemsSearch, setAddItemsSearch] = useState('');
  const [tempSelectedItems, setTempSelectedItems] = useState<Map<string, number>>(new Map()); // itemId -> quantity

  // Sale form
  const [saleDate, setSaleDate] = useState(today);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [salePhone, setSalePhone] = useState('');
  const [salePaid, setSalePaid] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [salePhoto, setSalePhoto] = useState<string | null>(null);
  const [saleInvoice, setSaleInvoice] = useState('');
  const [saleCustomItemName, setSaleCustomItemName] = useState('');
  const [saleCustomItemQty, setSaleCustomItemQty] = useState('1');
  const [saleCustomItemPrice, setSaleCustomItemPrice] = useState('');

  const saleSubTotal = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + item.total, 0), [currentTransactionItems]);
  const saleVat = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0), [currentTransactionItems]);
  const saleGrandTotal = useMemo(() => saleSubTotal + saleVat, [saleSubTotal, saleVat]);
  const saleDue = useMemo(() => saleGrandTotal - (parseFloat(salePaid) || 0), [saleGrandTotal, salePaid]);


  // Repair form
  const [repairDate, setRepairDate] = useState(today);
  const [repairSupplier, setRepairSupplier] = useState('');
  const [repairCustomer, setRepairCustomer] = useState('');
  const [repairCustomerPhone, setRepairCustomerPhone] = useState('');
  const [repairProblem, setRepairProblem] = useState('');
  const [repairTotal, setRepairTotal] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairPaid, setRepairPaid] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [repairPhoto, setRepairPhoto] = useState<string | null>(null);
  const repairProfit = useMemo(() => (parseFloat(repairTotal) || 0) - (parseFloat(repairCost) || 0), [repairTotal, repairCost]);
  const repairDue = useMemo(() => (parseFloat(repairTotal) || 0) - (parseFloat(repairPaid) || 0), [repairTotal, repairPaid]);

  // Purchase form
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [purchaseInvoice, setPurchaseInvoice] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchasePhoto, setPurchasePhoto] = useState<string | null>(null);
  const [purchaseSupplierSearch, setPurchaseSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [purchaseCustomItemName, setPurchaseCustomItemName] = useState('');
  const [purchaseCustomItemQty, setPurchaseCustomItemQty] = useState('1');
  const [purchaseCustomItemPrice, setPurchaseCustomItemPrice] = useState('');
  const purchaseSubTotal = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + item.total, 0), [currentTransactionItems]);
  const purchaseVat = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0), [currentTransactionItems]);
  const purchaseGrandTotal = useMemo(() => purchaseSubTotal + purchaseVat, [purchaseSubTotal, purchaseVat]);

  // Sales Return form
  const [salesReturnDate, setSalesReturnDate] = useState(today);
  const [salesReturnInvoice, setSalesReturnInvoice] = useState('');
  const [salesReturnType, setSalesReturnType] = useState<SalesReturnType>('Return');
  const [salesReturnCustomer, setSalesReturnCustomer] = useState('');
  const [salesReturnNotes, setSalesReturnNotes] = useState('');
  const [salesReturnPhoto, setSalesReturnPhoto] = useState<string|null>(null);
  const salesReturnSubTotal = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + item.total, 0), [currentTransactionItems]);
  const salesReturnVat = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0), [currentTransactionItems]);
  const salesReturnGrandTotal = useMemo(() => salesReturnSubTotal + salesReturnVat, [salesReturnSubTotal, salesReturnVat]);


  // Purchase Return form
  const [purchaseReturnDate, setPurchaseReturnDate] = useState(today);
  const [purchaseReturnInvoice, setPurchaseReturnInvoice] = useState('');
  const [purchaseReturnType, setPurchaseReturnType] = useState<PurchaseReturnType>('Return');
  const [purchaseReturnSupplier, setPurchaseReturnSupplier] = useState('');
  const [purchaseReturnNotes, setPurchaseReturnNotes] = useState('');
  const [purchaseReturnPhoto, setPurchaseReturnPhoto] = useState<string|null>(null);
  const purchaseReturnSubTotal = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + item.total, 0), [currentTransactionItems]);
  const purchaseReturnVat = useMemo(() => currentTransactionItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0), [currentTransactionItems]);
  const purchaseReturnGrandTotal = useMemo(() => purchaseReturnSubTotal + purchaseReturnVat, [purchaseReturnSubTotal, purchaseReturnVat]);

  
  // Expense form
  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expensePhoto, setExpensePhoto] = useState<string | null>(null);

  // Payment Out form
  const [paymentOutAmount, setPaymentOutAmount] = useState('');
  const [paymentOutRecipient, setPaymentOutRecipient] = useState('');
  const [paymentOutDate, setPaymentOutDate] = useState(today);
  const [paymentOutMethod, setPaymentOutMethod] = useState<PaymentMethod>('cash');
  const [paymentOutCheckNo, setPaymentOutCheckNo] = useState('');
  const [paymentOutNotes, setPaymentOutNotes] = useState('');
  const [paymentOutPhoto, setPaymentOutPhoto] = useState<string|null>(null);
  
  // Payment In form
  const [paymentInAmount, setPaymentInAmount] = useState('');
  const [paymentInParty, setPaymentInParty] = useState('');
  const [paymentInDate, setPaymentInDate] = useState(today);
  const [paymentInMethod, setPaymentInMethod] = useState<PaymentMethod>('cash');
  const [paymentInCheckNo, setPaymentInCheckNo] = useState('');
  const [paymentInNotes, setPaymentInNotes] = useState('');
  const [paymentInPhoto, setPaymentInPhoto] = useState<string|null>(null);

  // Inventory Item form
  const [itemName, setItemName] = useState('');
  const [itemImei, setItemImei] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPriceIncTax, setItemPriceIncTax] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemSubCategory, setItemSubCategory] = useState<'Smartphone' | 'Accessories'>('Smartphone');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Filters State - Staged (for inputs) and Applied (for calculations)
  const [partiesSearchTerm, setPartiesSearchTerm] = useState('');
  const [partiesFilterType, setPartiesFilterType] = useState<PartyType | 'All'>('All');
  const [partyLedgerSearch, setPartyLedgerSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('All');
  const [inventorySubCategoryFilter, setInventorySubCategoryFilter] = useState<'All' | 'Smartphone' | 'Accessories'>('All');
  const [expandedFullLedgerRows, setExpandedFullLedgerRows] = useState<Set<string>>(new Set());

  // General Records Filters
  const [stagedRecordsSearch, setStagedRecordsSearch] = useState('');
  const [stagedFilterFromDate, setStagedFilterFromDate] = useState('');
  const [stagedFilterToDate, setStagedFilterToDate] = useState('');
  const [stagedAllTransactionsTypeFilter, setStagedAllTransactionsTypeFilter] = useState<TransactionType | 'All'>('All');
  const [stagedAllTransactionsBrandFilter, setStagedAllTransactionsBrandFilter] = useState<string>('All');
  
  const [appliedRecordsSearch, setAppliedRecordsSearch] = useState('');
  const [appliedFilterFromDate, setAppliedFilterFromDate] = useState('');
  const [appliedFilterToDate, setAppliedFilterToDate] = useState('');
  const [appliedAllTransactionsTypeFilter, setAppliedAllTransactionsTypeFilter] = useState<TransactionType | 'All'>('All');
  const [appliedAllTransactionsBrandFilter, setAppliedAllTransactionsBrandFilter] = useState<string>('All');

  // PnL Filters
  const [stagedPnlFromDate, setStagedPnlFromDate] = useState('');
  const [stagedPnlToDate, setStagedPnlToDate] = useState('');
  const [appliedPnlFromDate, setAppliedPnlFromDate] = useState('');
  const [appliedPnlToDate, setAppliedPnlToDate] = useState('');

  // Tax Report Filters
  const [stagedTaxFromDate, setStagedTaxFromDate] = useState('');
  const [stagedTaxToDate, setStagedTaxToDate] = useState('');
  const [appliedTaxFromDate, setAppliedTaxFromDate] = useState('');
  const [appliedTaxToDate, setAppliedTaxToDate] = useState('');
  const [taxReportView, setTaxReportView] = useState<'summary' | 'sales' | 'purchase'>('summary');
  
  // Best Selling Filters
  const [stagedBestSellingFromDate, setStagedBestSellingFromDate] = useState('');
  const [stagedBestSellingToDate, setStagedBestSellingToDate] = useState('');
  const [stagedBestSellingBrandFilter, setStagedBestSellingBrandFilter] = useState('All');
  const [appliedBestSellingFromDate, setAppliedBestSellingFromDate] = useState('');
  const [appliedBestSellingToDate, setAppliedBestSellingToDate] = useState('');
  const [appliedBestSellingBrandFilter, setAppliedBestSellingBrandFilter] = useState('All');

  // Full Ledger Filters
  const [stagedFullLedgerSearch, setStagedFullLedgerSearch] = useState('');
  const [stagedFullLedgerFromDate, setStagedFullLedgerFromDate] = useState('');
  const [stagedFullLedgerToDate, setStagedFullLedgerToDate] = useState('');
  const [stagedFullLedgerPartyFilter, setStagedFullLedgerPartyFilter] = useState('All');
  const [stagedFullLedgerTypeFilter, setStagedFullLedgerTypeFilter] = useState('All');
  
  const [appliedFullLedgerSearch, setAppliedFullLedgerSearch] = useState('');
  const [appliedFullLedgerFromDate, setAppliedFullLedgerFromDate] = useState('');
  const [appliedFullLedgerToDate, setAppliedFullLedgerToDate] = useState('');
  const [appliedFullLedgerPartyFilter, setAppliedFullLedgerPartyFilter] = useState('All');
  const [appliedFullLedgerTypeFilter, setAppliedFullLedgerTypeFilter] = useState('All');
  
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // --- Data Persistence Logic ---
  const persistableState = useMemo(() => ({
    parties, salesRecords, repairJobsRecords, expensesRecords, ledgerRecords,
    purchaseRecords, paymentInRecords, paymentOutRecords, purchaseReturnRecords,
    salesReturnRecords, inventoryItems, itemCategories,
  }), [
      parties, salesRecords, repairJobsRecords, expensesRecords, ledgerRecords,
      purchaseRecords, paymentInRecords, paymentOutRecords, purchaseReturnRecords,
      salesReturnRecords, inventoryItems, itemCategories,
  ]);
  const debouncedState = useDebounce(persistableState, 2000);
  
  const handleUnlinkGoogleDrive = useCallback(() => {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token revoked.');
        });
    }
    gapi.client.setToken(null);
    setIsLoggedInToGoogle(false);
    setGdriveFileId(null);
    setSyncStatus('Not Linked.');
  }, []);

  const handleDriveError = useCallback((err: any, operation: string) => {
    const errorMessage = err?.result?.error?.message || err?.message || 'An unknown error occurred.';
    console.error(`Error during ${operation}:`, err);
    setSyncStatus(`Sync Error: ${errorMessage}`);
    
    // If auth error, log out user and prompt them to re-link
    if (err?.result?.error?.code === 401 || err?.result?.error?.code === 403) {
      alert(`Authentication Error: ${errorMessage}. Your session may have expired or your credentials may be misconfigured. Please link your account again.`);
      handleUnlinkGoogleDrive();
    }
  }, [handleUnlinkGoogleDrive]);


  const saveStateToDrive = useCallback(async (stateToSave: typeof persistableState) => {
    if (!isLoggedInToGoogle || !gapiReady || !gdriveFileId) return;

    setSyncStatus('Syncing...');
    try {
        const fileContent = JSON.stringify(stateToSave, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });

        await gapi.client.request({
            path: `/upload/drive/v3/files/${gdriveFileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: blob,
        });
        
        setSyncStatus(`Synced: ${new Date().toLocaleTimeString()}`);
    } catch (err: any) {
        handleDriveError(err, 'file update');
    }
  }, [isLoggedInToGoogle, gapiReady, gdriveFileId, handleDriveError]);

  useEffect(() => {
      if (isInitializing) return;
      
      localStorage.setItem('appData', JSON.stringify(debouncedState));

      if (isLoggedInToGoogle) {
        saveStateToDrive(debouncedState);
      }
  }, [debouncedState, isInitializing, isLoggedInToGoogle, saveStateToDrive]);


  const loadStateFromInitial = () => {
      setParties(initialParties);
      setSalesRecords(initialSales);
      setRepairJobsRecords(initialRepairJobs);
      setExpensesRecords(initialExpenses);
      setLedgerRecords(initialLedger);
      setPurchaseRecords(initialPurchases);
      setPaymentInRecords(initialPaymentIn);
      setPaymentOutRecords(initialPaymentOut);
      setPurchaseReturnRecords(initialPurchaseReturns);
      setSalesReturnRecords(initialSalesReturns);
      setInventoryItems(initialInventoryItems);
      const initialCategories = Array.from(new Set(initialInventoryItems.map(i => i.category)));
      setItemCategories(initialCategories);
  }

  const hydrateState = (data: any) => {
      setParties(data.parties || []);
      setSalesRecords(data.salesRecords || []);
      setRepairJobsRecords(data.repairJobsRecords || []);
      setExpensesRecords(data.expensesRecords || []);
      setLedgerRecords(data.ledgerRecords || []);
      setPurchaseRecords(data.purchaseRecords || []);
      setPaymentInRecords(data.paymentInRecords || []);
      setPaymentOutRecords(data.paymentOutRecords || []);
      setPurchaseReturnRecords(data.purchaseReturnRecords || []);
      setSalesReturnRecords(data.salesReturnRecords || []);
      setInventoryItems(data.inventoryItems || []);
      setItemCategories(data.itemCategories || []);
  }

  const restoreDataFromDrive = useCallback(async () => {
    if (!gdriveFileId) {
        setSyncStatus('Error: No file to restore.');
        return;
    }
    setSyncStatus('Restoring from Google Drive...');
    try {
        const res = await gapi.client.drive.files.get({
            fileId: gdriveFileId,
            alt: 'media'
        });
        hydrateState(res.result);
        setSyncStatus('Data restored successfully.');
    } catch (err: any) {
        handleDriveError(err, 'restore data');
    }
  }, [gdriveFileId, handleDriveError]);


  const findOrCreateDataFile = useCallback(async () => {
    setSyncStatus('Checking Google Drive...');
    try {
        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            q: `name='${DATA_FILE_NAME}'`
        });

        if (response.result.files && response.result.files.length > 0) {
            const fileId = response.result.files[0].id!;
            setGdriveFileId(fileId);
            await restoreDataFromDrive();
        } else {
            console.log('No data file found, creating a new one.');
            setSyncStatus('Creating data file...');
            const fileMetadata = {
                name: DATA_FILE_NAME,
                parents: ['appDataFolder']
            };
            // Use current state (which could be from localStorage) as the initial content
            const initialContent = JSON.stringify(persistableState, null, 2);
            const blob = new Blob([initialContent], { type: 'application/json' });
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', blob);

            const createResponse = await gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart' },
                body: form
            });
            
            setGdriveFileId(createResponse.result.id);
            setSyncStatus('Ready to sync.');
        }
    } catch (err: any) {
        handleDriveError(err, 'find or create file');
    }
  }, [persistableState, restoreDataFromDrive, handleDriveError]);

  // --- Google API Initialization ---
  useEffect(() => {
    const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    const handleGapiLoad = () => gapi.load('client', () => setGapiReady(true));
    const handleGisLoad = () => setGisReady(true);

    if (gapi?.client) { handleGapiLoad(); } 
    else { gapiScript?.addEventListener('load', handleGapiLoad); }
    
    if (google?.accounts) { handleGisLoad(); }
    else { gisScript?.addEventListener('load', handleGisLoad); }


    return () => {
        gapiScript?.removeEventListener('load', handleGapiLoad);
        gisScript?.removeEventListener('load', handleGisLoad);
    };
  }, []);

  useEffect(() => {
    if (gapiReady) {
        gapi.client.init({ apiKey: API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] })
          .catch((err: any) => handleDriveError(err, 'GAPI client init'));
    }
    if (gisReady) {
        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        console.error(tokenResponse.error);
                        setSyncStatus(`Auth failed: ${tokenResponse.error}`);
                        return;
                    }
                    setIsLoggedInToGoogle(true);
                    setShowSyncPopup(false);
                    await findOrCreateDataFile();
                },
            });
            setTokenClient(client);
        } catch (err: any) {
            handleDriveError(err, 'GIS client init');
        }
    }
  }, [gapiReady, gisReady, findOrCreateDataFile, handleDriveError]);


  const handleLinkGoogleDrive = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const handleLogout = () => {
      if (isLoggedInToGoogle) {
          if (window.confirm('Are you sure you want to log out? This will unlink your Google Drive account.')) {
              handleUnlinkGoogleDrive();
              alert('You have been logged out.');
          }
      } else {
          alert('You are not logged in to Google Drive.');
      }
  };
  
  // PIN Management
  useEffect(() => {
    const storedPin = localStorage.getItem('app-pin');
    if (storedPin) {
        setIsPinSet(true);
        setShowPinLockScreen(true);
    } else {
        setIsPinSet(false);
        setShowPinLockScreen(false);
    }
    setLoading(false); // Move loading finish here
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const storedPin = localStorage.getItem('app-pin');
      if (pinEntry === storedPin) {
          setShowPinLockScreen(false);
          setPinError('');
          setPinEntry('');
      } else {
          setPinError('Incorrect PIN. Please try again.');
          setPinEntry('');
      }
  };

  const handleSetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        alert('PIN must be 4 digits.');
        return;
    }
    if (newPin !== confirmNewPin) {
        alert('PINs do not match.');
        return;
    }
    localStorage.setItem('app-pin', newPin);
    setIsPinSet(true);
    setShowPinModal(false);
    setNewPin('');
    setConfirmNewPin('');
    alert('PIN created successfully!');
  };

  const handleDeletePin = useCallback(() => {
    setShowPinDeleteConfirm(true);
  }, []);

  const confirmPinDelete = () => {
    localStorage.removeItem('app-pin');
    setIsPinSet(false);
    setShowPinLockScreen(false);
    setShowPinDeleteConfirm(false);
    alert('PIN has been deleted.');
  };

  const cancelPinDelete = () => {
    setShowPinDeleteConfirm(false);
  };

  const switchView = (newView: View, state?: any) => {
    setPreviousView(currentView);
    setCurrentView(newView);
    if(state) {
        if(newView === View.ADD_ITEMS_TO_TRANSACTION) {
            setCurrentTransactionType(state);
            setAddItemsSearch('');
        }
    }
  };

  const loadData = useCallback(() => {
    setIsInitializing(true);
    const localData = localStorage.getItem('appData');
    if (localData) {
        hydrateState(JSON.parse(localData));
    } else {
        loadStateFromInitial();
        if (!localStorage.getItem('syncPopupShown')) {
          setShowSyncPopup(true);
          localStorage.setItem('syncPopupShown', 'true');
        }
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
    }, [theme]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsMenuRef, supplierDropdownRef]);

    useEffect(() => {
        if(editingParty) {
            setPartyType(editingParty.type);
            setPartyName(editingParty.name);
            setPartyContact(editingParty.contact);
            setPartyAddress(editingParty.address);
            setPartyPanNumber(editingParty.panNumber || '');
            setPartyBalanceType(editingParty.balanceType);
            setPartyBalanceAmount(String(editingParty.balanceAmount));
            setPartyBalanceDate(editingParty.balanceDate);
        }
    }, [editingParty]);
    
    useEffect(() => {
        if (salePhone) {
            const foundParty = parties.find(p => p.type === 'customer' && p.contact === salePhone);
            if (foundParty) {
                setSaleCustomerName(foundParty.name);
            }
        }
    }, [salePhone, parties]);
    
    useEffect(() => {
        if (repairCustomerPhone) {
            const foundParty = parties.find(p => p.type === 'customer' && p.contact === repairCustomerPhone);
            if (foundParty) {
                setRepairCustomer(foundParty.name);
            }
        }
    }, [repairCustomerPhone, parties]);

    useEffect(() => {
        if(editingInventoryItem) {
            setItemName(editingInventoryItem.name);
            setItemImei(editingInventoryItem.imei || '');
            setItemPrice(String(editingInventoryItem.purchasePrice));
            setItemPriceIncTax(String(editingInventoryItem.purchasePriceIncTax));
            setItemCategory(editingInventoryItem.category);
            setItemSubCategory(editingInventoryItem.subCategory);
        }
    }, [editingInventoryItem]);

    const handleRefresh = () => {
        if (isLoggedInToGoogle) {
            restoreDataFromDrive();
        } else {
            loadData();
        }
    };

  const handleCalculate = (expression: string, setter: (value: string) => void) => {
    if (!expression) return;
    try {
      const result = new Function('return ' + expression.replace(/[^0-9+*\/(). -]/g, ''))();
      if (typeof result === 'number' && isFinite(result)) setter(String(result));
    } catch (error) { console.error("Calculation error:", error); alert("Invalid calculation."); }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) setter(URL.createObjectURL(e.target.files[0]));
  };

  const clearFormStates = useCallback((form: View | 'paymentOut') => {
    const resetDate = new Date().toISOString().split('T')[0];
    switch (form) {
      case View.SALES: setSaleDate(resetDate); setSaleCustomerName(''); setSalePhone(''); setSalePaid(''); setSaleNotes(''); setSalePhoto(null); setSaleInvoice(''); setEditingSaleId(null); setCurrentTransactionItems([]); setTempSelectedItems(new Map()); setSaleCustomItemName(''); setSaleCustomItemQty('1'); setSaleCustomItemPrice(''); break;
      case View.REPAIR_JOBS: setRepairDate(resetDate); setRepairSupplier(''); setRepairCustomer(''); setRepairCustomerPhone(''); setRepairProblem(''); setRepairTotal(''); setRepairCost(''); setRepairPaid(''); setRepairNotes(''); setRepairPhoto(null); setEditingRepairId(null); break;
      case View.PURCHASE: setPurchaseDate(resetDate); setPurchaseInvoice(''); setPurchaseSupplier(''); setPurchaseNotes(''); setPurchasePhoto(null); setEditingPurchaseId(null); setPurchaseSupplierSearch(''); setCurrentTransactionItems([]); setTempSelectedItems(new Map()); setPurchaseCustomItemName(''); setPurchaseCustomItemQty('1'); setPurchaseCustomItemPrice(''); break;
      case View.ADD_PARTY: setPartyType('customer'); setPartyName(''); setPartyContact(''); setPartyAddress(''); setPartyPanNumber(''); setPartyBalanceType('debit'); setPartyBalanceAmount(''); setPartyBalanceDate(resetDate); setEditingParty(null); break;
      case View.ADD_ITEM: setItemName(''); setItemImei(''); setItemPrice(''); setItemPriceIncTax(''); setItemCategory(''); setItemSubCategory('Smartphone'); setEditingInventoryItem(null); setNewCategoryName(''); setIsAddingCategory(false); break;
      case View.EXPENSES: setExpenseDate(resetDate); setExpenseTitle(''); setExpenseAmount(''); setExpenseNotes(''); setExpensePhoto(null); setEditingExpenseId(null); break;
      case View.PAYMENT_IN: setPaymentInAmount(''); setPaymentInParty(''); setPaymentInDate(resetDate); setPaymentInMethod('cash'); setPaymentInCheckNo(''); setPaymentInNotes(''); setPaymentInPhoto(null); setPaymentContext(null); setEditingPaymentInId(null); break;
      case 'paymentOut': setPaymentOutAmount(''); setPaymentOutRecipient(''); setPaymentOutDate(resetDate); setPaymentOutMethod('cash'); setPaymentOutCheckNo(''); setPaymentOutNotes(''); setPaymentOutPhoto(null); setEditingPaymentOutId(null); break;
      case View.PURCHASE_RETURN: setPurchaseReturnDate(resetDate); setPurchaseReturnInvoice(''); setPurchaseReturnType('Return'); setPurchaseReturnSupplier(''); setPurchaseReturnNotes(''); setPurchaseReturnPhoto(null); setEditingPurchaseReturnId(null); setCurrentTransactionItems([]); setTempSelectedItems(new Map()); break;
      case View.SALES_RETURN: setSalesReturnDate(resetDate); setSalesReturnInvoice(''); setSalesReturnType('Return'); setSalesReturnCustomer(''); setSalesReturnNotes(''); setSalesReturnPhoto(null); setEditingSalesReturnId(null); setCurrentTransactionItems([]); setTempSelectedItems(new Map()); break;
    }
  }, []);
  
  const clearAllEditingStates = () => {
      setEditingParty(null);
      setEditingSaleId(null);
      setEditingRepairId(null);
      setEditingPurchaseId(null);
      setEditingExpenseId(null);
      setEditingPaymentOutId(null);
      setEditingPaymentInId(null);
      setEditingPurchaseReturnId(null);
      setEditingSalesReturnId(null);
      setEditingInventoryItem(null);
  };

    const handleSaveParty = useCallback(() => {
        if (!partyName || !partyContact) { alert("Party Name and Contact are required."); return; }
        
        if (editingParty) {
            const updatedParty: Party = { ...editingParty, type: partyType, name: partyName, contact: partyContact, address: partyAddress, panNumber: partyPanNumber, balanceType: partyBalanceType, balanceAmount: parseFloat(partyBalanceAmount) || 0, balanceDate: partyBalanceDate };
            setParties(prev => prev.map(p => p.id === editingParty.id ? updatedParty : p));

            setLedgerRecords(prevLedger => {
                const ledgerWithUpdatedName = editingParty.name === partyName 
                    ? prevLedger 
                    : prevLedger.map(entry => (entry.partyName === editingParty.name ? { ...entry, partyName } : entry));

                const openingBalanceEntry = ledgerWithUpdatedName.find(
                    entry => entry.partyName === partyName && entry.transactionType === 'opening_balance'
                );
                
                const newBalance = parseFloat(partyBalanceAmount) || 0;

                if (openingBalanceEntry) {
                    if (newBalance > 0) {
                        return ledgerWithUpdatedName.map(entry =>
                            entry.id === openingBalanceEntry.id
                                ? {
                                      ...entry,
                                      date: partyBalanceDate,
                                      amount: newBalance,
                                      type: partyBalanceType === 'debit' ? 'Debit' : 'Credit',
                                  }
                                : entry
                        );
                    } else {
                        return ledgerWithUpdatedName.filter(entry => entry.id !== openingBalanceEntry.id);
                    }
                } else if (newBalance > 0) {
                    const newEntry: LedgerEntry = {
                        id: generateId(),
                        date: partyBalanceDate,
                        description: `Opening Balance for ${partyName}`,
                        type: partyBalanceType === 'debit' ? 'Debit' : 'Credit',
                        amount: newBalance,
                        partyName: partyName,
                        transactionType: 'opening_balance' as TransactionType,
                    };
                    return [...ledgerWithUpdatedName, newEntry];
                }
                
                return ledgerWithUpdatedName;
            });

        } else {
            const newParty: Party = { id: generateId(), type: partyType, name: partyName, contact: partyContact, address: partyAddress, panNumber: partyPanNumber, balanceType: partyBalanceType, balanceAmount: parseFloat(partyBalanceAmount) || 0, balanceDate: partyBalanceDate };
            setParties(prev => [newParty, ...prev]);
            if (newParty.balanceAmount > 0) {
                const desc = `Opening Balance for ${partyName}`;
                const type: 'Debit' | 'Credit' = newParty.balanceType === 'debit' ? 'Debit' : 'Credit';
                const newEntry: LedgerEntry = {
                    id: generateId(),
                    date: partyBalanceDate,
                    description: desc,
                    type,
                    amount: newParty.balanceAmount,
                    partyName,
                    transactionType: 'opening_balance',
                };
                setLedgerRecords(prev => [...prev, newEntry]);
            }
        }
        
        clearFormStates(View.ADD_PARTY);
        switchView(View.PARTIES);
    }, [partyType, partyName, partyContact, partyAddress, partyPanNumber, partyBalanceType, partyBalanceAmount, partyBalanceDate, editingParty, clearFormStates]);

    const handleSaveInventoryItem = useCallback(() => {
        const price = parseFloat(itemPrice) || 0;
        if (!itemName || !itemCategory || price <= 0) { alert("Item Name, Category, and a valid Price are required."); return; }
        
        const priceIncTax = parseFloat(itemPriceIncTax) || price * 1.13;

        if(editingInventoryItem) {
            const updatedItem = { ...editingInventoryItem, name: itemName, imei: itemImei, purchasePrice: price, purchasePriceIncTax: priceIncTax, category: itemCategory, subCategory: itemSubCategory };
            setInventoryItems(prev => prev.map(item => item.id === editingInventoryItem.id ? updatedItem : item));
        } else {
            const newItem: InventoryItem = { id: generateId(), name: itemName, imei: itemImei, purchasePrice: price, purchasePriceIncTax: priceIncTax, category: itemCategory, subCategory: itemSubCategory, quantity: 0 };
            setInventoryItems(prev => [newItem, ...prev]);
        }
        
        clearFormStates(View.ADD_ITEM);
        switchView(previousView);
    }, [itemName, itemImei, itemPrice, itemPriceIncTax, itemCategory, itemSubCategory, editingInventoryItem, previousView, clearFormStates]);

    const handleAddNewCategory = () => {
        if (newCategoryName.trim() && !itemCategories.includes(newCategoryName.trim())) {
            const newCat = newCategoryName.trim();
            setItemCategories(prev => [...prev, newCat]);
            setItemCategory(newCat);
            setNewCategoryName('');
            setIsAddingCategory(false);
        } else {
            alert("Category name cannot be empty or a duplicate.");
        }
    };

    const handleAddCustomPurchaseItem = () => {
        const name = purchaseCustomItemName.trim();
        const qty = parseFloat(purchaseCustomItemQty) || 0;
        const price = parseFloat(purchaseCustomItemPrice) || 0;
        if (!name || qty <= 0 || price <= 0) {
            alert("Please enter a valid name, quantity, and price for the custom item.");
            return;
        }
        const newItem: TransactionItem = {
            name,
            quantity: qty,
            rate: price,
            tax: 0,
            total: qty * price
        };
        setCurrentTransactionItems(prev => [...prev, newItem]);
        setPurchaseCustomItemName('');
        setPurchaseCustomItemQty('1');
        setPurchaseCustomItemPrice('');
    };


  const handleAddPurchase = useCallback(() => {
    if (!purchaseSupplier || currentTransactionItems.length === 0) { alert("Supplier and at least one item are required."); return; }
    
    const recordId = editingPurchaseId || generateId();
    const purchaseRecord: Purchase = { 
        id: recordId, 
        date: purchaseDate, 
        invoiceNumber: purchaseInvoice, 
        supplierName: purchaseSupplier, 
        items: currentTransactionItems, 
        subTotal: purchaseSubTotal,
        vatAmount: purchaseVat,
        totalAmount: purchaseGrandTotal, 
        notes: purchaseNotes, 
        photo: purchasePhoto 
    };

    if (editingPurchaseId) {
        setPurchaseRecords(prev => prev.map(p => p.id === editingPurchaseId ? purchaseRecord : p));
    } else {
        setPurchaseRecords(prev => [purchaseRecord, ...prev]);
    }

    setInventoryItems(prevItems => {
        const newItems = [...prevItems];
        currentTransactionItems.forEach(transItem => {
            if (transItem.itemId) {
                const itemIndex = newItems.findIndex(invItem => invItem.id === transItem.itemId);
                if(itemIndex > -1) {
                    newItems[itemIndex].quantity += transItem.quantity;
                }
            }
        });
        return newItems;
    });
    
    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const description = `Purchase: ${currentTransactionItems.length} item(s)`;
        const newEntry: LedgerEntry = {id: generateId(), date: purchaseDate, description, type: 'Credit', amount: purchaseGrandTotal, partyName: purchaseSupplier, notes: purchaseNotes, photo: purchasePhoto, originalRecordId: recordId, transactionType: 'purchase', invoiceNumber: purchaseInvoice};
        return [...otherRecords, newEntry];
    });

    clearFormStates(View.PURCHASE);
    setShowPostTransactionPopup({type: 'purchase', id: recordId});
  }, [purchaseDate, purchaseInvoice, purchaseSupplier, currentTransactionItems, purchaseNotes, purchasePhoto, editingPurchaseId, purchaseSubTotal, purchaseVat, purchaseGrandTotal, clearFormStates]);


  const handleAddSale = useCallback(() => {
    const paid = parseFloat(salePaid) || 0;
    if (currentTransactionItems.length === 0) { alert("At least one item is required for a sale."); return; }
    
    const recordId = editingSaleId || generateId();
    const saleRecord: Sale = { id: recordId, customerName: saleCustomerName.trim(), phone: salePhone, items: currentTransactionItems, subTotal: saleSubTotal, vatAmount: saleVat, totalAmount: saleGrandTotal, paid, due: saleDue, date: saleDate, notes: saleNotes, photo: salePhoto, invoiceNumber: saleInvoice };
    
    if (editingSaleId) {
        setSalesRecords(prev => prev.map(s => s.id === editingSaleId ? saleRecord : s));
    } else {
        const customerNameTrimmed = saleCustomerName.trim();
        if (customerNameTrimmed) {
            let customer = parties.find(p => p.type === 'customer' && (p.name.toLowerCase() === customerNameTrimmed.toLowerCase() || (salePhone && p.contact === salePhone)));
            if (!customer) {
                customer = { id: generateId(), type: 'customer', name: customerNameTrimmed, contact: salePhone, address: '', balanceType: 'debit', balanceAmount: 0, balanceDate: saleDate };
                setParties(prev => [customer!, ...prev]);
            }
        }
        setSalesRecords(prev => [saleRecord, ...prev]);
    }
    
    setInventoryItems(prevItems => {
        const newItems = [...prevItems];
        currentTransactionItems.forEach(transItem => {
            if (transItem.itemId) {
                const itemIndex = newItems.findIndex(invItem => invItem.id === transItem.itemId);
                if(itemIndex > -1) {
                    newItems[itemIndex].quantity -= transItem.quantity;
                }
            }
        });
        return newItems;
    });

    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntries: LedgerEntry[] = [];
        if (saleRecord.customerName) {
            const description = `Sale: ${currentTransactionItems.length} item(s)`;
            newEntries.push({ id: generateId(), date: saleDate, description, type: 'Debit', amount: saleRecord.totalAmount, partyName: saleRecord.customerName, notes: saleNotes, photo: salePhoto, originalRecordId: recordId, transactionType: 'sale', invoiceNumber: saleInvoice });
            if (paid > 0) {
               newEntries.push({id: generateId(), date: saleDate, description: `Payment for sale #${saleInvoice || recordId.substring(0,5)}`, type: 'Credit', amount: paid, partyName: saleRecord.customerName, notes: `Paid against sale`, photo: salePhoto, originalRecordId: recordId, transactionType: 'payment_in'});
            }
        }
        return [...otherRecords, ...newEntries];
    });

    clearFormStates(View.SALES);
    setShowPostTransactionPopup({type: 'sale', id: recordId});
  }, [saleDate, saleCustomerName, salePhone, currentTransactionItems, salePaid, saleNotes, salePhoto, saleInvoice, editingSaleId, parties, saleSubTotal, saleVat, saleGrandTotal, saleDue, clearFormStates]);


  const handleAddRepairJob = useCallback(() => {
    const total = parseFloat(repairTotal) || 0;
    const cost = parseFloat(repairCost) || 0;
    const paid = parseFloat(repairPaid) || 0;
    if (!repairProblem.trim() || total <= 0) {
        alert("Problem and a valid Total amount are required.");
        return;
    }

    const recordId = editingRepairId || generateId();
    const profit = total - cost;
    const due = total - paid;
    
    const customerNameTrimmed = repairCustomer.trim();
    const customerPhoneTrimmed = repairCustomerPhone.trim();

    // Only create/link a party if customer details are provided
    if (customerNameTrimmed || customerPhoneTrimmed) {
        let customer = parties.find(p => p.type === 'customer' && 
            ( (customerNameTrimmed && p.name.toLowerCase() === customerNameTrimmed.toLowerCase()) || (customerPhoneTrimmed && p.contact === customerPhoneTrimmed) )
        );
        
        if (!customer) {
            const newCustomer: Party = {
                id: generateId(),
                type: 'customer',
                name: customerNameTrimmed || `Customer ${customerPhoneTrimmed}`,
                contact: customerPhoneTrimmed,
                address: '',
                balanceType: 'debit',
                balanceAmount: 0,
                balanceDate: repairDate,
            };
            setParties(prev => [newCustomer, ...prev]);
        }
    }
    
    const repairRecord: RepairJob = { id: recordId, date: repairDate, supplier: repairSupplier, customerName: repairCustomer, problem: repairProblem, total, cost, paid, profit, due, notes: repairNotes, photo: repairPhoto };
    
    if (editingRepairId) {
        setRepairJobsRecords(prev => prev.map(r => r.id === editingRepairId ? repairRecord : r));
    } else {
        setRepairJobsRecords(prev => [repairRecord, ...prev]);
    }
    
    // Only create ledger entries if there is a customer associated
    if (customerNameTrimmed) {
        setLedgerRecords(prev => {
            const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
            const newEntries: LedgerEntry[] = [];
            
            newEntries.push({id: generateId(), date: repairDate, description: `Repair: ${repairProblem}`, type: 'Debit', amount: total, partyName: customerNameTrimmed, notes: repairNotes, photo: repairPhoto, originalRecordId: recordId, transactionType: 'repair'});
            if (paid > 0) {
                newEntries.push({id: generateId(), date: repairDate, description: `Payment for ${repairProblem}`, type: 'Credit', amount: paid, partyName: customerNameTrimmed, notes: `Paid against repair of ${repairProblem}`, photo: repairPhoto, originalRecordId: recordId, transactionType: 'payment_in'});
            }
            
            return [...otherRecords, ...newEntries];
        });
    }

    alert('Repair job saved successfully!');
    clearFormStates(View.REPAIR_JOBS);
    if(editingRepairId) {
      switchView(View.RECORDS);
      setActiveRecordView('repairs');
    } else {
      switchView(View.DASHBOARD);
    }
  }, [repairDate, repairSupplier, repairCustomer, repairCustomerPhone, repairProblem, repairTotal, repairCost, repairPaid, repairNotes, repairPhoto, editingRepairId, clearFormStates, parties]);


  const handleAddPurchaseReturn = useCallback(() => {
    if (!purchaseReturnSupplier || currentTransactionItems.length === 0) { alert("Supplier and at least one item are required."); return; }

    const recordId = editingPurchaseReturnId || generateId();
    const returnRecord: PurchaseReturn = { id: recordId, date: purchaseReturnDate, invoiceNumber: purchaseReturnInvoice, type: purchaseReturnType, supplierName: purchaseReturnSupplier, items: currentTransactionItems, subTotal: purchaseReturnSubTotal, vatAmount: purchaseReturnVat, totalAmount: purchaseReturnGrandTotal, notes: purchaseReturnNotes, photo: purchaseReturnPhoto };

    if (editingPurchaseReturnId) {
        setPurchaseReturnRecords(prev => prev.map(pr => pr.id === editingPurchaseReturnId ? returnRecord : pr));
    } else {
        setPurchaseReturnRecords(prev => [returnRecord, ...prev]);
    }

    setInventoryItems(prevItems => {
        const newItems = [...prevItems];
        currentTransactionItems.forEach(transItem => {
            if (transItem.itemId) {
              const itemIndex = newItems.findIndex(invItem => invItem.id === transItem.itemId);
              if (itemIndex > -1) {
                  newItems[itemIndex].quantity -= transItem.quantity; 
              }
            }
        });
        return newItems;
    });

    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntry: LedgerEntry = {id: generateId(), date: purchaseReturnDate, description: `${purchaseReturnType} to ${purchaseReturnSupplier}`, type: 'Debit', amount: purchaseReturnGrandTotal, partyName: purchaseReturnSupplier, notes: purchaseReturnNotes, photo: purchaseReturnPhoto, originalRecordId: recordId, transactionType: 'purchase_return', invoiceNumber: purchaseReturnInvoice};
        return [...otherRecords, newEntry];
    });
    
    clearFormStates(View.PURCHASE_RETURN);
    setSelectedParty(parties.find(p => p.name === purchaseReturnSupplier) || null);
    switchView(View.PARTY_LEDGER);
  }, [purchaseReturnDate, purchaseReturnInvoice, purchaseReturnType, purchaseReturnSupplier, currentTransactionItems, purchaseReturnNotes, purchaseReturnPhoto, editingPurchaseReturnId, parties, clearFormStates, purchaseReturnSubTotal, purchaseReturnVat, purchaseReturnGrandTotal]);


  const handleAddSalesReturn = useCallback(() => {
    if (!salesReturnCustomer || currentTransactionItems.length === 0) { alert("Customer and at least one item are required."); return; }

    const recordId = editingSalesReturnId || generateId();
    const returnRecord: SalesReturn = { id: recordId, date: salesReturnDate, invoiceNumber: salesReturnInvoice, type: salesReturnType, customerName: salesReturnCustomer, items: currentTransactionItems, subTotal: salesReturnSubTotal, vatAmount: salesReturnVat, totalAmount: salesReturnGrandTotal, notes: salesReturnNotes, photo: salesReturnPhoto };

    if (editingSalesReturnId) {
        setSalesReturnRecords(prev => prev.map(sr => sr.id === editingSalesReturnId ? returnRecord : sr));
    } else {
        setSalesReturnRecords(prev => [returnRecord, ...prev]);
    }

    setInventoryItems(prevItems => {
        const newItems = [...prevItems];
        currentTransactionItems.forEach(transItem => {
            if (transItem.itemId) {
              const itemIndex = newItems.findIndex(invItem => invItem.id === transItem.itemId);
              if (itemIndex > -1) {
                  newItems[itemIndex].quantity += transItem.quantity; 
              }
            }
        });
        return newItems;
    });

    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntry: LedgerEntry = { id: generateId(), date: salesReturnDate, description: `${salesReturnType} from ${salesReturnCustomer}`, type: 'Credit', amount: salesReturnGrandTotal, partyName: salesReturnCustomer, notes: salesReturnNotes, photo: salesReturnPhoto, originalRecordId: recordId, transactionType: 'sales_return', invoiceNumber: salesReturnInvoice };
        return [...otherRecords, newEntry];
    });

    clearFormStates(View.SALES_RETURN);
    setSelectedParty(parties.find(p => p.name === salesReturnCustomer) || null);
    switchView(View.PARTY_LEDGER);
  }, [salesReturnDate, salesReturnInvoice, salesReturnType, salesReturnCustomer, currentTransactionItems, salesReturnNotes, salesReturnPhoto, editingSalesReturnId, parties, clearFormStates, salesReturnSubTotal, salesReturnVat, salesReturnGrandTotal]);


  const handleAddExpense = useCallback(() => {
    const amount = parseFloat(expenseAmount) || 0;
    if (!expenseTitle || amount <= 0) { alert("Title and a valid Amount are required."); return; }

    const recordId = editingExpenseId || generateId();
    const expenseRecord: Expense = { id: recordId, title: expenseTitle, amount, date: expenseDate, notes: expenseNotes, photo: expensePhoto };

    if (editingExpenseId) {
        setExpensesRecords(prev => prev.map(e => e.id === editingExpenseId ? expenseRecord : e));
    } else {
        setExpensesRecords(prev => [expenseRecord, ...prev]);
    }

    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntry: LedgerEntry = { id: generateId(), date: expenseDate, description: `Expense: ${expenseTitle}`, type: 'Debit', amount, partyName: 'N/A', notes: expenseNotes, photo: expensePhoto, originalRecordId: recordId, transactionType: 'expense' };
        return [...otherRecords, newEntry];
    });
    
    clearFormStates(View.EXPENSES);
    switchView(View.RECORDS);
    setActiveRecordView('expenses');
  }, [expenseDate, expenseTitle, expenseAmount, expenseNotes, expensePhoto, editingExpenseId, clearFormStates]);

  const handleAddPaymentOut = useCallback(() => {
    const amount = parseFloat(paymentOutAmount);
    if (!amount || !paymentOutRecipient) { alert("Amount and Recipient are required."); return; }
    
    const recordId = editingPaymentOutId || generateId();
    const paymentRecord: Payment = { id: recordId, amount, partyName: paymentOutRecipient, date: paymentOutDate, description: `Payment to ${paymentOutRecipient}`, method: paymentOutMethod, checkNo: paymentOutMethod === 'check' ? paymentOutCheckNo : '', notes: paymentOutNotes, photo: paymentOutPhoto };

    if (editingPaymentOutId) {
        setPaymentOutRecords(prev => prev.map(p => p.id === editingPaymentOutId ? paymentRecord : p));
    } else {
        setPaymentOutRecords(prev => [...prev, paymentRecord]);
    }
    
    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntry: LedgerEntry = { id: generateId(), date: paymentOutDate, description: `Payment to ${paymentOutRecipient}`, type: 'Debit', amount, partyName: paymentOutRecipient, notes: paymentOutNotes, photo: paymentOutPhoto, checkNo: paymentOutMethod === 'check' ? paymentOutCheckNo : '', originalRecordId: recordId, transactionType: 'payment_out' };
        return [...otherRecords, newEntry];
    });
    
    clearFormStates('paymentOut');
    setShowPaymentModal(false);
    if(selectedParty) { switchView(View.PARTY_LEDGER); }
  }, [paymentOutAmount, paymentOutRecipient, paymentOutDate, paymentOutMethod, paymentOutCheckNo, paymentOutNotes, paymentOutPhoto, selectedParty, editingPaymentOutId, clearFormStates]);

  const handleReceivePayment = useCallback(() => {
    const amount = parseFloat(paymentInAmount);
    if(!amount || !paymentInParty) { alert("Amount and Party are required."); return; }
    
    const recordId = editingPaymentInId || generateId();
    const paymentRecord: Payment = {id: recordId, amount, partyName: paymentInParty, date: paymentInDate, description: `Payment from ${paymentInParty}`, method: paymentInMethod, checkNo: paymentInMethod === 'check' ? paymentInCheckNo : '', notes: paymentInNotes, photo: paymentInPhoto};

    if (editingPaymentInId) {
        setPaymentInRecords(prev => prev.map(p => p.id === editingPaymentInId ? paymentRecord : p));
    } else {
        if(paymentContext) {
            if (paymentContext.type === 'sale') setSalesRecords(prev => prev.map(s => s.id === paymentContext.recordId ? {...s, paid: s.paid + amount, due: s.due - amount } : s));
            else if (paymentContext.type === 'repair') setRepairJobsRecords(prev => prev.map(r => r.id === paymentContext.recordId ? {...r, paid: r.paid + amount, due: r.due - amount } : r));
        }
        setPaymentInRecords(prev => [...prev, paymentRecord]);
    }

    setLedgerRecords(prev => {
        const otherRecords = prev.filter(l => l.originalRecordId !== recordId);
        const newEntry: LedgerEntry = { id: generateId(), date: paymentInDate, description: `Payment from ${paymentInParty}`, type: 'Credit', amount, partyName: paymentInParty, notes: paymentInNotes, photo: paymentInPhoto, checkNo: paymentInMethod === 'check' ? paymentInCheckNo : '', originalRecordId: recordId, transactionType: 'payment_in' };
        return [...otherRecords, newEntry];
    });

    const partyToSelect = parties.find(p => p.name === paymentInParty);
    clearFormStates(View.PAYMENT_IN);

    if (partyToSelect) {
        setSelectedParty(partyToSelect);
        switchView(View.PARTY_LEDGER);
    } else if (paymentContext) {
        switchView(View.RECORDS);
        setActiveRecordView(paymentContext.type === 'sale' ? 'sales' : 'repairs');
    }
  }, [paymentInAmount, paymentInParty, paymentInDate, paymentInMethod, paymentInCheckNo, paymentInNotes, paymentInPhoto, paymentContext, editingPaymentInId, parties, clearFormStates]);
  
 const handleDeleteRecord = (recordId: string, type: TransactionType | 'party' | 'inventory') => {
    if (type === 'party') {
        const partyToDelete = parties.find(p => p.id === recordId);
        if (partyToDelete) {
            setParties(prev => prev.filter(p => p.id !== recordId));
            setLedgerRecords(prev => prev.filter(l => l.partyName !== partyToDelete.name));
        }
        switchView(View.PARTIES);
    } else if (type === 'inventory') {
        setInventoryItems(prev => prev.filter(i => i.id !== recordId));
    } else {
        setLedgerRecords(prev => prev.filter(l => l.originalRecordId !== recordId));
        switch(type) {
            case 'sale': setSalesRecords(prev => prev.filter(s => s.id !== recordId)); break;
            case 'purchase': setPurchaseRecords(prev => prev.filter(p => p.id !== recordId)); break;
            case 'repair': setRepairJobsRecords(prev => prev.filter(r => r.id !== recordId)); break;
            case 'expense': setExpensesRecords(prev => prev.filter(e => e.id !== recordId)); break;
            case 'payment_in': setPaymentInRecords(prev => prev.filter(p => p.id !== recordId)); break;
            case 'payment_out': setPaymentOutRecords(prev => prev.filter(p => p.id !== recordId)); break;
            case 'purchase_return': setPurchaseReturnRecords(prev => prev.filter(pr => pr.id !== recordId)); break;
            case 'sales_return': setSalesReturnRecords(prev => prev.filter(sr => sr.id !== recordId)); break;
            default: console.warn(`Delete not implemented for ${type}`);
        }
    }

    clearAllEditingStates();
    setShowPaymentModal(false);

    if (type === 'party') {
        switchView(View.PARTIES);
    } else if (selectedParty && ['sale', 'repair', 'purchase', 'payment_in', 'payment_out', 'purchase_return', 'sales_return'].includes(type)) {
        switchView(View.PARTY_LEDGER);
    } else if (type === 'inventory') {
        switchView(View.INVENTORY);
    } else {
        switchView(View.RECORDS);
        switch(type) {
            case 'sale': setActiveRecordView('sales'); break;
            case 'purchase': setActiveRecordView('all_transactions'); break;
            case 'repair': setActiveRecordView('repairs'); break;
            case 'expense': setActiveRecordView('expenses'); break;
            default: setActiveRecordView('menu');
        }
    }
};

    const promptDelete = (recordId: string, type: TransactionType | 'party' | 'inventory') => {
        setRecordToDelete({ recordId, type });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (!recordToDelete) return;
        handleDeleteRecord(recordToDelete.recordId, recordToDelete.type);
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
    };
    
    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
    };
  
    const handleEditParty = (party: Party) => {
        setEditingParty(party);
        switchView(View.ADD_PARTY);
    };

    const handleEditInventoryItem = (item: InventoryItem) => {
        setEditingInventoryItem(item);
        switchView(View.ADD_ITEM);
    };

    const handleEditRepairJob = (repairJob: RepairJob) => {
        setEditingRepairId(repairJob.id);
        setRepairDate(repairJob.date);
        setRepairSupplier(repairJob.supplier);
        setRepairCustomer(repairJob.customerName);
        const party = parties.find(p => p.name === repairJob.customerName);
        setRepairCustomerPhone(party?.contact || '');
        setRepairProblem(repairJob.problem);
        setRepairTotal(String(repairJob.total));
        setRepairCost(String(repairJob.cost));
        setRepairPaid(String(repairJob.paid));
        setRepairNotes(repairJob.notes);
        setRepairPhoto(repairJob.photo || null);
        switchView(View.REPAIR_JOBS);
    };


  const handleEditRecord = (record: Partial<LedgerEntry> & {originalRecordId?: string; transactionType: TransactionType}) => {
      if (!record.originalRecordId) return;
      const id = record.originalRecordId;

      switch(record.transactionType) {
        case 'sale': {
            const sale = salesRecords.find(s => s.id === id);
            if (!sale) return;
            setEditingSaleId(id); setSaleDate(sale.date); setSaleCustomerName(sale.customerName); setSalePhone(sale.phone); setCurrentTransactionItems(sale.items); setSalePaid(String(sale.paid)); setSaleNotes(sale.notes); setSalePhoto(sale.photo || null); setSaleInvoice(sale.invoiceNumber || '');
            switchView(View.SALES);
            break;
        }
        case 'purchase': {
            const purchase = purchaseRecords.find(p => p.id === id);
            if (!purchase) return;
            setEditingPurchaseId(id); setPurchaseDate(purchase.date); setPurchaseInvoice(purchase.invoiceNumber); setPurchaseSupplier(purchase.supplierName); setPurchaseSupplierSearch(purchase.supplierName); setCurrentTransactionItems(purchase.items); setPurchaseNotes(purchase.notes); setPurchasePhoto(purchase.photo || null);
            switchView(View.PURCHASE);
            break;
        }
        case 'repair': {
            const repair = repairJobsRecords.find(r => r.id === id);
            if(!repair) return;
            handleEditRepairJob(repair);
            break;
        }
        case 'payment_out': {
            const payment = paymentOutRecords.find(p => p.id === id);
            if (!payment) return;
            setEditingPaymentOutId(id); setPaymentOutAmount(String(payment.amount)); setPaymentOutRecipient(payment.partyName); setPaymentOutDate(payment.date); setPaymentOutMethod(payment.method); setPaymentOutCheckNo(payment.checkNo || ''); setPaymentOutNotes(payment.notes || ''); setPaymentOutPhoto(payment.photo || null);
            setShowPaymentModal(true);
            break;
        }
        case 'payment_in': {
            const payment = paymentInRecords.find(p => p.id === id);
            if(!payment) return;
            setEditingPaymentInId(id); setPaymentInAmount(String(payment.amount)); setPaymentInParty(payment.partyName); setPaymentInDate(payment.date); setPaymentInMethod(payment.method); setPaymentInCheckNo(payment.checkNo || ''); setPaymentInNotes(payment.notes || ''); setPaymentInPhoto(payment.photo || null);
            switchView(View.PAYMENT_IN);
            break;
        }
        case 'purchase_return': {
            const pReturn = purchaseReturnRecords.find(pr => pr.id === id);
            if(!pReturn) return;
            setEditingPurchaseReturnId(id); setPurchaseReturnDate(pReturn.date); setPurchaseReturnInvoice(pReturn.invoiceNumber); setPurchaseReturnType(pReturn.type); setPurchaseReturnSupplier(pReturn.supplierName); setCurrentTransactionItems(pReturn.items); setPurchaseReturnNotes(pReturn.notes); setPurchaseReturnPhoto(pReturn.photo || null);
            switchView(View.PURCHASE_RETURN);
            break;
        }
        case 'sales_return': {
            const sReturn = salesReturnRecords.find(sr => sr.id === id);
            if(!sReturn) return;
            setEditingSalesReturnId(id); setSalesReturnDate(sReturn.date); setSalesReturnInvoice(sReturn.invoiceNumber); setSalesReturnType(sReturn.type); setSalesReturnCustomer(sReturn.customerName); setCurrentTransactionItems(sReturn.items); setSalesReturnNotes(sReturn.notes); setSalesReturnPhoto(sReturn.photo || null);
            switchView(View.SALES_RETURN);
            break;
        }
        case 'expense': {
            const expense = expensesRecords.find(e => e.id === id);
            if(!expense) return;
            setEditingExpenseId(id); setExpenseDate(expense.date); setExpenseTitle(expense.title); setExpenseAmount(String(expense.amount)); setExpenseNotes(expense.notes || ''); setExpensePhoto(expense.photo || null);
            switchView(View.EXPENSES);
            break;
        }
      }
  }

  const totals = useMemo(() => ({
    sales: salesRecords.reduce((sum, sale) => sum + sale.totalAmount, 0),
    repairJobs: repairJobsRecords.reduce((sum, job) => sum + job.total, 0),
    purchases: purchaseRecords.reduce((sum, p) => sum + p.totalAmount, 0),
    expenses: expensesRecords.reduce((sum, e) => sum + e.amount, 0),
  }), [salesRecords, repairJobsRecords, purchaseRecords, expensesRecords]);
  
  const partyBalances = useMemo(() => {
    const balances: { [name: string]: { amount: number; label: string; type: string } } = {};
    parties.forEach(party => {
        const partyLedgerEntries = ledgerRecords.filter(entry => entry.partyName === party.name);
        
        let runningBalance = 0;
        const isCustomer = party.type === 'customer';

        for(const entry of partyLedgerEntries) {
            if (isCustomer) {
                runningBalance += (entry.type === 'Debit' ? entry.amount : -entry.amount);
            } else { // Supplier
                runningBalance += (entry.type === 'Credit' ? entry.amount : -entry.amount);
            }
        }
        
        let label = 'Settled';
        let type = 'settled';

        if (runningBalance !== 0) {
            if (isCustomer) {
                if (runningBalance > 0) { label = 'To Receive'; type = 'receive'; } 
                else { label = 'To Give'; type = 'give'; }
            } else { // Supplier
                if (runningBalance > 0) { label = 'To Give'; type = 'give'; } 
                else { label = 'To Receive'; type = 'receive'; }
            }
        }
        
        balances[party.name] = { amount: Math.abs(runningBalance), label, type };
    });
    return balances;
  }, [ledgerRecords, parties]);

  const filteredParties = useMemo(() => parties.filter(party => {
    const matchesSearch = partiesSearchTerm ? party.name.toLowerCase().includes(partiesSearchTerm.toLowerCase()) : true;
    const matchesType = partiesFilterType === 'All' ? true : party.type === partiesFilterType;
    return matchesSearch && matchesType;
  }), [parties, partiesSearchTerm, partiesFilterType]);

  const processedPartyLedger = useMemo(() => {
    if (!selectedParty) return [];

    const partyLedgerEntries = ledgerRecords
        .filter(entry => entry.partyName === selectedParty.name)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningBalance = 0; 
    const isCustomer = selectedParty.type === 'customer';

    const processed = partyLedgerEntries.map(entry => {
        let debit = 0;
        let credit = 0;
        
        if (entry.type === 'Debit') debit = entry.amount;
        else credit = entry.amount;

        if (isCustomer) { 
            runningBalance += (debit - credit);
        } else { // Supplier
            runningBalance += (credit - debit);
        }
        
        const balanceType = isCustomer 
            ? (runningBalance >= 0 ? 'Dr' : 'Cr') 
            : (runningBalance >= 0 ? 'Cr' : 'Dr');

        return { ...entry, debit, credit, balance: Math.abs(runningBalance), balanceType };
    });

    return processed.reverse();
  }, [selectedParty, ledgerRecords]);

  const currentBalanceInfo = useMemo(() => {
        if (!selectedParty) return { amount: 0, label: '' };
        if (processedPartyLedger.length === 0) {
            return { amount: 0, label: 'Settled' };
        }
        
        const latestEntry = processedPartyLedger[0];
        const isCustomer = selectedParty.type === 'customer';
        
        let finalLabel = '';
        if (latestEntry.balance === 0) return { amount: 0, label: 'Settled' };

        if (isCustomer) {
            finalLabel = latestEntry.balanceType === 'Dr' ? 'To Receive' : 'To Give';
        } else { // Supplier
            finalLabel = latestEntry.balanceType === 'Cr' ? 'To Give' : 'To Give';
        }
        
        return { amount: latestEntry.balance, label: finalLabel };
   }, [selectedParty, processedPartyLedger]);

    const supplierAndPartsParties = useMemo(() => parties.filter(p => p.type === 'supplier' || p.type === 'parts').map(p => p.name), [parties]);

    // Use memo for filtered data for each record type
    const baseFilteredData = useCallback((records: any[]) => {
        return records.filter(item => {
            const searchMatch = appliedRecordsSearch ? JSON.stringify(item).toLowerCase().includes(appliedRecordsSearch.toLowerCase()) : true;
            const fromDate = appliedFilterFromDate ? new Date(appliedFilterFromDate) : null;
            const toDate = appliedFilterToDate ? new Date(appliedFilterToDate) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);
            const itemDate = new Date(item.date);
            const dateMatch = (!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate);
            return searchMatch && dateMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appliedRecordsSearch, appliedFilterFromDate, appliedFilterToDate]);
    
    const filteredSalesData = useMemo(() => baseFilteredData(salesRecords), [baseFilteredData, salesRecords]);
    const filteredRepairsData = useMemo(() => baseFilteredData(repairJobsRecords), [baseFilteredData, repairJobsRecords]);
    const filteredExpensesData = useMemo(() => baseFilteredData(expensesRecords), [baseFilteredData, expensesRecords]);

    const filteredAllTransactionsData = useMemo(() => {
        const all = [
            ...salesRecords.map(r => ({...r, recordType: 'sale', partyName: r.customerName})),
            ...purchaseRecords.map(r => ({...r, recordType: 'purchase', partyName: r.supplierName})),
            ...salesReturnRecords.map(r => ({...r, recordType: 'sales_return', partyName: r.customerName})),
            ...purchaseReturnRecords.map(r => ({...r, recordType: 'purchase_return', partyName: r.supplierName})),
            ...paymentInRecords.map(r => ({...r, recordType: 'payment_in'})),
            ...paymentOutRecords.map(r => ({...r, recordType: 'payment_out'})),
            ...expensesRecords.map(r => ({...r, recordType: 'expense', partyName: 'N/A'})),
            ...repairJobsRecords.map(r => ({...r, amount: r.total, recordType: 'repair', partyName: r.customerName})),
        ];

        return all.filter(item => {
            const searchMatch = appliedRecordsSearch ? JSON.stringify(item).toLowerCase().includes(appliedRecordsSearch.toLowerCase()) : true;
            const fromDate = appliedFilterFromDate ? new Date(appliedFilterFromDate) : null;
            const toDate = appliedFilterToDate ? new Date(appliedFilterToDate) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);
            const itemDate = new Date(item.date);
            const dateMatch = (!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate);

            if (appliedAllTransactionsTypeFilter !== 'All' && item.recordType !== appliedAllTransactionsTypeFilter) {
                return false;
            }
            if (appliedAllTransactionsBrandFilter !== 'All') {
                if (!('items' in item) || !Array.isArray((item as any).items)) return false;
                const hasBrand = (item as any).items.some((transItem: TransactionItem) => {
                    if (!transItem.itemId) return false;
                    const invItem = inventoryItems.find(i => i.id === transItem.itemId);
                    return invItem?.category === appliedAllTransactionsBrandFilter;
                });
                if (!hasBrand) return false;
            }
            return searchMatch && dateMatch;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [salesRecords, purchaseRecords, salesReturnRecords, purchaseReturnRecords, paymentInRecords, paymentOutRecords, expensesRecords, repairJobsRecords, inventoryItems, appliedRecordsSearch, appliedFilterFromDate, appliedFilterToDate, appliedAllTransactionsTypeFilter, appliedAllTransactionsBrandFilter]);

    const filteredFullLedgerData = useMemo(() => {
      const fullLedgerBaseData = ledgerRecords.map(entry => ({
            ...entry,
            debit: entry.type === 'Debit' ? entry.amount : 0,
            credit: entry.type === 'Credit' ? entry.amount : 0,
        })).filter(entry => {
            const isExpense = entry.transactionType === 'expense';
            const party = parties.find(p => p.name === entry.partyName);
            const isSupplierOrPart = party ? (party.type === 'supplier' || party.type === 'parts') : false;
            return isExpense || isSupplierOrPart || entry.transactionType === 'opening_balance' && !isSupplierOrPart;
        });

        return fullLedgerBaseData.filter(entry => {
            const from = appliedFullLedgerFromDate ? new Date(appliedFullLedgerFromDate) : null;
            const to = appliedFullLedgerToDate ? new Date(appliedFullLedgerToDate) : null;
            if(from) from.setHours(0,0,0,0);
            if(to) to.setHours(23,59,59,999);
            const itemDate = new Date(entry.date);
            if(from && to && (itemDate < from || itemDate > to)) return false;
            if(from && itemDate < from) return false;
            if(to && itemDate > to) return false;

            if (appliedFullLedgerPartyFilter !== 'All' && entry.partyName !== appliedFullLedgerPartyFilter) return false;
            if (appliedFullLedgerTypeFilter !== 'All' && entry.transactionType !== appliedFullLedgerTypeFilter) return false;
            
            if (appliedFullLedgerSearch) {
                const searchTerm = appliedFullLedgerSearch.toLowerCase();
                return entry.description.toLowerCase().includes(searchTerm) ||
                    entry.partyName.toLowerCase().includes(searchTerm) ||
                    (entry.invoiceNumber && entry.invoiceNumber.toLowerCase().includes(searchTerm)) ||
                    (entry.notes && entry.notes.toLowerCase().includes(searchTerm));
            }
            return true;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [ledgerRecords, parties, appliedFullLedgerFromDate, appliedFullLedgerToDate, appliedFullLedgerPartyFilter, appliedFullLedgerTypeFilter, appliedFullLedgerSearch]);
    
    const fullLedgerTotals = useMemo(() => {
        return filteredFullLedgerData.reduce((acc, entry) => {
            acc.debit += entry.debit;
            acc.credit += entry.credit;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [filteredFullLedgerData]);

  const toggleLedgerRow = (id: string) => {
    setExpandedLedgerRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };
    
    const toggleFullLedgerRow = (id: string) => {
    setExpandedFullLedgerRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
    });
  };

  const handleDownloadRequest = (context: { title: string; headers: string[]; data: any[]; csvFormatter: (data: any[]) => any[][] }) => {
    setDownloadContext(context);
    setShowDownloadModal(true);
  };
  
  const handleExportCsv = () => {
    if (!downloadContext) return;
    const { title, headers, csvFormatter, data } = downloadContext;
    const csvData = csvFormatter(data);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\r\n";
    csvData.forEach(rowArray => {
      const row = rowArray.map(item => `"${String(item === undefined || item === null ? '' : item).replace(/"/g, '""')}"`).join(",");
      csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/ /g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadModal(false);
  };

  const handleShare = async () => {
    if (!downloadContext) return;
    const { title, data } = downloadContext;
    const text = `Report: ${title}\nTotal Records: ${data.length}\nGenerated on: ${new Date().toLocaleDateString()}`;
    if(navigator.share) {
        try {
            await navigator.share({ title, text });
        } catch (error) {
            console.error('Error sharing:', error);
            alert('Sharing failed.');
        }
    } else {
        navigator.clipboard.writeText(text).then(() => alert('Report summary copied to clipboard!'));
    }
    setShowDownloadModal(false);
  };

  const inputBaseClasses = 'p-3 border rounded-lg w-full';
  const inputThemeClasses = theme === 'light' ? 'input-light-theme' : 'dark:bg-brand-input-dark dark:border-gray-600';
  const inputClasses = `${inputBaseClasses} ${inputThemeClasses}`;


  if (loading || (isPinSet && showPinLockScreen)) {
    // Show Lock Screen or a generic loading spinner
    if (isPinSet && showPinLockScreen) {
        return (
            <div className={`theme-${theme} ${theme} font-inter min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-brand-dark'} flex flex-col items-center justify-center`}>
                <div className="w-full max-w-xs text-center">
                    <Lock size={40} className="mx-auto mb-6 text-gray-400" />
                    <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">Enter PIN</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your 4-digit PIN to unlock the app.</p>
                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="password"
                            value={pinEntry}
                            onChange={(e) => {
                                if (/^\d{0,4}$/.test(e.target.value)) {
                                    setPinEntry(e.target.value);
                                    setPinError('');
                                }
                            }}
                            maxLength={4}
                            className="w-48 text-center text-3xl tracking-[1.5rem] bg-gray-100 dark:bg-brand rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
                        <button type="submit" className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={pinEntry.length !== 4}>Unlock</button>
                    </form>
                </div>
            </div>
        );
    }
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  if (error) return <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700">{error}</div>;
  
  const PageHeader = ({ titleOverride }: { titleOverride?: string }) => {
    const titleMap: Record<string, string> = { 
        [View.DASHBOARD]: 'Dashboard', [View.PARTIES]: 'Parties', 
        [View.ADD_PARTY]: editingParty ? 'Edit Party' : 'Add New Party', 
        [View.PARTY_LEDGER]: selectedParty?.name || 'Party Ledger', [View.RECORDS]: 'Records', 
        [View.SALES]: editingSaleId ? 'Edit Sale' : 'Add Sale', 
        [View.REPAIR_JOBS]: editingRepairId ? 'Edit Repair' : 'Add Repair',
        [View.EXPENSES]: editingExpenseId ? 'Edit Expense' : 'Add Expense', 
        [View.PURCHASE]: editingPurchaseId ? 'Edit Purchase' : 'Add Purchase',
        [View.PAYMENT_IN]: editingPaymentInId ? 'Edit Payment In' : `Payment from ${paymentContext?.partyName || paymentInParty || ''}`,
        [View.PURCHASE_RETURN]: editingPurchaseReturnId ? 'Edit Purchase Return' : 'Purchase Return',
        [View.SALES_RETURN]: editingSalesReturnId ? 'Edit Sales Return' : 'Sales Return',
        [View.INVENTORY]: 'Inventory',
        [View.ADD_ITEM]: editingInventoryItem ? 'Edit Item' : 'Add New Item',
        [View.ADD_ITEMS_TO_TRANSACTION]: 'Add Items/Services',
        [View.CONFIRM_TRANSACTION_ITEMS]: 'Confirm Items',
        [View.PRODUCT_TRANSACTION_HISTORY]: selectedInventoryItem?.name || 'Product History',
        [View.BEST_SELLING_PRODUCTS]: 'Best Selling Products',
        [View.SETTINGS]: 'Settings',
    };
    const title = titleOverride || titleMap[currentView] || 'Business Manager';
    const isNavHidden = currentView !== View.DASHBOARD;
    
    const handleBack = () => {
        const cameFromPartyLedger = !!selectedParty;
        const cameFromInventory = !!selectedInventoryItem;
        const isEditing = !!(editingParty || editingSaleId || editingRepairId || editingPurchaseId || editingExpenseId || editingPaymentInId || editingPurchaseReturnId || editingSalesReturnId || editingInventoryItem);
        
        clearAllEditingStates();

        switch(currentView) {
            case View.PARTY_LEDGER: setPartyLedgerSearch(''); setSelectedParty(null); switchView(View.PARTIES); break;
            case View.PRODUCT_TRANSACTION_HISTORY: setSelectedInventoryItem(null); switchView(View.INVENTORY); break;
            case View.ADD_PARTY: switchView(View.PARTIES); break;
            case View.SALES:
            case View.PURCHASE:
                if (isEditing && cameFromPartyLedger) switchView(View.PARTY_LEDGER);
                else if (isEditing && cameFromInventory) switchView(View.PRODUCT_TRANSACTION_HISTORY);
                else switchView(View.DASHBOARD);
                clearFormStates(currentView);
                break;
            case View.REPAIR_JOBS:
            case View.PURCHASE_RETURN:
            case View.SALES_RETURN:
            case View.PAYMENT_IN:
            case View.EXPENSES:
                 if (cameFromPartyLedger && isEditing) switchView(View.PARTY_LEDGER);
                 else if (currentView === View.EXPENSES || currentView === View.REPAIR_JOBS) { switchView(View.RECORDS); setActiveRecordView(currentView === 'expenses' ? 'expenses' : 'repairs'); } 
                 else switchView(View.DASHBOARD);
                 clearFormStates(currentView);
                 break;
            case View.PARTIES: 
            case View.RECORDS: 
            case View.INVENTORY:
            case View.BEST_SELLING_PRODUCTS:
            case View.SETTINGS:
                switchView(View.DASHBOARD); 
                break;
            case View.ADD_ITEM: switchView(previousView); break;
            case View.ADD_ITEMS_TO_TRANSACTION: switchView(currentTransactionType === 'sale' ? View.SALES : currentTransactionType === 'purchase' ? View.PURCHASE : currentTransactionType === 'sales_return' ? View.SALES_RETURN : View.PURCHASE_RETURN); break;
            case View.CONFIRM_TRANSACTION_ITEMS: switchView(View.ADD_ITEMS_TO_TRANSACTION, currentTransactionType); break;
            default: switchView(View.DASHBOARD);
        }
    }
    
    const ThemeViewSwitcher = () => (
      <div className="flex items-center justify-around bg-gray-100 dark:bg-brand-dark rounded-lg p-1 mx-4 my-2">
        <button onClick={() => setTheme('light')} className={`p-2 rounded-md ${theme === 'light' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`} title="Light Mode">
          <Sun size={18}/>
        </button>
        <button onClick={() => setTheme('dark')} className={`p-2 rounded-md ${theme === 'dark' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`} title="Dark Mode">
          <Moon size={18}/>
        </button>
        <button onClick={() => setViewMode(prev => prev === 'mobile' ? 'pc' : 'mobile')} className={`p-2 rounded-md ${viewMode === 'pc' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`} title={viewMode === 'mobile' ? 'PC View' : 'Mobile View'}>
          {viewMode === 'mobile' ? <Laptop size={18}/> : <Smartphone size={18}/>}
        </button>
      </div>
    );
    
    return (
        <header className="flex items-center justify-between mb-4 no-print text-gray-800 dark:text-gray-200">
            <div className="flex items-center">
                {isNavHidden && <button onClick={handleBack} className="mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-brand"><ArrowLeft size={20}/></button>}
                {isNavHidden && (
                    <button onClick={() => switchView(View.DASHBOARD)} className="mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-brand" title="Go to Dashboard">
                       <Home size={20} />
                   </button>
                 )}
                <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
                 <div className="relative" ref={settingsMenuRef}>
                     {currentView === View.CONFIRM_TRANSACTION_ITEMS ? (
                        <button onClick={() => switchView(View.ADD_ITEMS_TO_TRANSACTION, currentTransactionType)} className="p-2 rounded-lg bg-blue-500 text-white flex items-center gap-1 text-sm px-3"><Plus size={16}/> Add</button>
                     ) : (
                        <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-brand"><MoreVertical size={20}/></button>
                     )}
                    {showSettingsMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-brand rounded-md shadow-lg z-20 text-gray-800 dark:text-gray-200">
                           <ThemeViewSwitcher />
                           <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <button onClick={() => { switchView(View.SETTINGS); setShowSettingsMenu(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <Settings size={16}/> Settings
                            </button>
                            <button onClick={() => { handleRefresh(); setShowSettingsMenu(false); }} className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <RefreshCw size={16}/> Refresh Data
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
  };
  
  const renderView = () => {
    const navigateToRecords = (view: RecordType) => {
        switchView(View.RECORDS);
        setActiveRecordView(view);
    }
    switch (currentView) {
      case View.DASHBOARD: {
        const shortcutButtons = [
            { onClick: () => { clearFormStates('paymentOut'); setShowPaymentModal(true); }, label: "Payment Out", icon: ArrowUpCircle, color: 'text-orange-500' },
            { onClick: () => { clearFormStates(View.ADD_PARTY); switchView(View.ADD_PARTY); }, label: "Add Party", icon: UserPlus, color: 'text-purple-500' },
            { onClick: () => { clearFormStates(View.PAYMENT_IN); switchView(View.PAYMENT_IN); }, label: "Payment In", icon: ArrowDownCircle, color: 'text-green-500' },
            { onClick: () => { clearFormStates(View.EXPENSES); switchView(View.EXPENSES); }, label: "Add Expense", icon: DollarSign, color: 'text-red-500' },
            { onClick: () => { switchView(View.RECORDS); setActiveRecordView('menu'); }, label: "Records", icon: Book, color: 'text-indigo-500' },
            { onClick: () => { switchView(View.RECORDS); setActiveRecordView('repairs'); }, label: "Details", icon: FileText, color: 'text-cyan-500' },
        ];
        return (
            <div className="relative">
                <DashboardChart totals={totals} theme={theme} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div onClick={()=>navigateToRecords('sales')} className="bg-white dark:bg-brand p-4 rounded-lg shadow-md cursor-pointer"><h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Sales</h2><p className="text-2xl font-bold text-blue-500">{(totals.sales || 0).toFixed(2)}</p></div>
                    <div onClick={()=>navigateToRecords('repairs')} className="bg-white dark:bg-brand p-4 rounded-lg shadow-md cursor-pointer"><h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Repairs</h2><p className="text-2xl font-bold text-green-500">{(totals.repairJobs || 0).toFixed(2)}</p></div>
                     <div onClick={()=> switchView(View.PARTIES)} className="bg-white dark:bg-brand p-4 rounded-lg shadow-md cursor-pointer"><h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Purchase</h2><p className="text-2xl font-bold text-teal-500">{(totals.purchases || 0).toFixed(2)}</p></div>
                    <div onClick={()=>navigateToRecords('expenses')} className="bg-white dark:bg-brand p-4 rounded-lg shadow-md cursor-pointer"><h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Expenses</h2><p className="text-2xl font-bold text-red-500">{(totals.expenses || 0).toFixed(2)}</p></div>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-6">
                    {shortcutButtons.map(btn => (
                        <button key={btn.label} onClick={btn.onClick} className="flex flex-col items-center justify-center bg-white dark:bg-brand p-3 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <btn.icon size={24} className={`${btn.color} mb-1`} />
                            <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300">{btn.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-4">
                    <button onClick={() => switchView(View.BEST_SELLING_PRODUCTS)} className="w-full flex items-center justify-center bg-white dark:bg-brand p-4 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span className="text-xl mr-3">🔥</span>
                        <span className="font-semibold text-lg text-gray-700 dark:text-gray-300">Best Selling Products</span>
                    </button>
                </div>
                 <button onClick={() => { clearFormStates(View.SALES); switchView(View.SALES); }} className="fixed bottom-24 left-6 bg-red-500 text-white p-4 rounded-full shadow-lg z-30 no-print">
                    <ReceiptText size={24} />
                  </button>
                  <button onClick={() => { clearFormStates(View.REPAIR_JOBS); switchView(View.REPAIR_JOBS); }} className="fixed bottom-24 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg z-30 no-print">
                    <Wrench size={24} />
                  </button>
            </div>
        );
      }
      case View.ADD_PARTY:
        return ( <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4"> <div className="flex space-x-2"> {(['customer', 'supplier', 'parts'] as PartyType[]).map(type => ( <button key={type} onClick={() => setPartyType(type)} className={`flex-1 py-2 px-1 text-sm font-semibold rounded-md transition-colors ${partyType === type ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800'}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>))} </div> <input type="text" placeholder="Party Name*" value={partyName} onChange={e=>setPartyName(e.target.value)} className={inputClasses}/> <input type="text" placeholder="Phone Number*" value={partyContact} onChange={e=>setPartyContact(e.target.value)} className={inputClasses}/> <input type="text" placeholder="Address" value={partyAddress} onChange={e=>setPartyAddress(e.target.value)} className={inputClasses}/> <input type="text" placeholder="PAN Number (Optional)" value={partyPanNumber} onChange={e=>setPartyPanNumber(e.target.value)} className={inputClasses}/> <div className="grid grid-cols-2 gap-4"> <input type="number" placeholder="Opening Balance" value={partyBalanceAmount} onChange={e=>setPartyBalanceAmount(e.target.value)} className={inputClasses} /> <div><input type="date" value={partyBalanceDate} onChange={e=>setPartyBalanceDate(e.target.value)} className={inputClasses} /><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(partyBalanceDate)}</p></div> </div> <div className="flex items-center gap-4"> <label className="flex items-center gap-2"><input type="radio" name="balanceType" value="debit" checked={partyBalanceType === 'debit'} onChange={() => setPartyBalanceType('debit')} /> To Receive</label> <label className="flex items-center gap-2"><input type="radio" name="balanceType" value="credit" checked={partyBalanceType === 'credit'} onChange={() => setPartyBalanceType('credit')} /> To Give</label> </div> <div className="flex justify-between items-center mt-4"><div>{editingParty && <button onClick={()=>promptDelete(editingParty.id, 'party')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div><div className="flex gap-3"><button onClick={()=>switchView(View.PARTIES)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> <button onClick={handleSaveParty} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingParty ? 'Update' : 'Save'}</button></div></div> </div> );
      case View.PURCHASE:
          return ( 
            <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4">
                <div><input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(purchaseDate)}</p></div> 
                <input type="text" placeholder="Invoice Number" value={purchaseInvoice} onChange={e=>setPurchaseInvoice(e.target.value)} className={inputClasses}/> 
                <div className="relative" ref={supplierDropdownRef}><input type="text" placeholder="Search & Select Supplier*" value={purchaseSupplierSearch} onFocus={() => setIsSupplierDropdownOpen(true)} onChange={e => { setPurchaseSupplierSearch(e.target.value); setPurchaseSupplier(''); setIsSupplierDropdownOpen(true); }} className={inputClasses}/>{isSupplierDropdownOpen && (<div className="absolute z-10 w-full bg-white dark:bg-brand border dark:border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">{parties.filter(p => p.type !== 'customer' && p.name.toLowerCase().includes(purchaseSupplierSearch.toLowerCase())).map(s => (<div key={s.id} onClick={() => { setPurchaseSupplier(s.name); setPurchaseSupplierSearch(s.name); setIsSupplierDropdownOpen(false); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">{s.name}</div>))}</div>)}</div> 
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-brand-dark/50 rounded-lg">
                    <div className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center">
                        <input type="text" placeholder="Add custom item..." value={purchaseCustomItemName} onChange={e=>setPurchaseCustomItemName(e.target.value)} className={`${inputClasses} p-2 text-sm`}/>
                        <input type="number" placeholder="Qty" value={purchaseCustomItemQty} onChange={e=>setPurchaseCustomItemQty(e.target.value)} className={`${inputClasses} p-2 text-sm w-16`}/>
                        <input type="number" placeholder="Price" value={purchaseCustomItemPrice} onChange={e=>setPurchaseCustomItemPrice(e.target.value)} className={`${inputClasses} p-2 text-sm w-20`}/>
                        <button onClick={handleAddCustomPurchaseItem} className="p-2 bg-green-500 text-white rounded-lg"><Plus size={20}/></button>
                    </div>
                    <p className="text-center text-xs text-gray-500">OR</p>
                    <button onClick={() => switchView(View.ADD_ITEMS_TO_TRANSACTION, 'purchase')} className="w-full py-3 text-center bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">Add Item From Inventory</button> 
                </div>
                {currentTransactionItems.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-brand-dark/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm"><p>Sub Total:</p> <p>{purchaseSubTotal.toFixed(2)}</p></div>
                        <div className="flex justify-between text-sm"><p>VAT:</p> <p>{purchaseVat.toFixed(2)}</p></div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 border-gray-300 dark:border-gray-700"><p>Total:</p> <p>{purchaseGrandTotal.toFixed(2)}</p></div>
                    </div>
                )}
                <textarea placeholder="Notes" value={purchaseNotes} onChange={e=>setPurchaseNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/> 
                <div><input id="purchase-photo" type="file" accept="image/*" onChange={e => handleFileChange(e, setPurchasePhoto)} className="hidden"/> <label htmlFor="purchase-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div> 
                <div className="flex justify-between items-center mt-4"><div>{editingPurchaseId && <button onClick={()=>promptDelete(editingPurchaseId, 'purchase')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div><div className="flex gap-3"><button onClick={()=>switchView(View.DASHBOARD)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> <button onClick={handleAddPurchase} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingPurchaseId ? 'Update' : 'Save'}</button></div></div>
            </div> 
          );
      case View.SALES:
          const handleAddCustomSaleItem = () => {
              const name = saleCustomItemName.trim();
              const qty = parseFloat(saleCustomItemQty) || 0;
              const price = parseFloat(saleCustomItemPrice) || 0;
              if (!name || qty <= 0 || price <= 0) {
                  alert("Please enter a valid name, quantity, and price for the custom item.");
                  return;
              }
              const newItem: TransactionItem = {
                  name,
                  quantity: qty,
                  rate: price,
                  tax: 0,
                  total: qty * price
              };
              setCurrentTransactionItems(prev => [...prev, newItem]);
              setSaleCustomItemName('');
              setSaleCustomItemQty('1');
              setSaleCustomItemPrice('');
          };
          return (
              <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md">
                  <div className="space-y-4">
                      <div><input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(saleDate)}</p></div>
                      <input type="text" placeholder="Invoice Number" value={saleInvoice} onChange={e => setSaleInvoice(e.target.value)} className={inputClasses}/>
                      <input type="text" placeholder="Customer Name" value={saleCustomerName} onChange={e=>setSaleCustomerName(e.target.value)} className={inputClasses}/>
                      <input type="tel" placeholder="Phone Number" value={salePhone} onChange={e=>setSalePhone(e.target.value)} className={inputClasses}/>
                      <div className="space-y-3 p-3 bg-gray-50 dark:bg-brand-dark/50 rounded-lg">
                        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center">
                          <input type="text" placeholder="Add custom item..." value={saleCustomItemName} onChange={e=>setSaleCustomItemName(e.target.value)} className={`${inputClasses} p-2 text-sm`}/>
                          <input type="number" placeholder="Qty" value={saleCustomItemQty} onChange={e=>setSaleCustomItemQty(e.target.value)} className={`${inputClasses} p-2 text-sm w-16`}/>
                          <input type="number" placeholder="Price" value={saleCustomItemPrice} onChange={e=>setSaleCustomItemPrice(e.target.value)} className={`${inputClasses} p-2 text-sm w-20`}/>
                          <button onClick={handleAddCustomSaleItem} className="p-2 bg-green-500 text-white rounded-lg"><Plus size={20}/></button>
                        </div>
                        <p className="text-center text-xs text-gray-500">OR</p>
                        <button onClick={() => switchView(View.ADD_ITEMS_TO_TRANSACTION, 'sale')} className="w-full py-3 text-center bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">Add Item From Inventory</button>
                      </div>
                      {currentTransactionItems.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-brand-dark/50 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm"><p>Sub Total (Ex. VAT):</p> <p>{saleSubTotal.toFixed(2)}</p></div>
                            <div className="flex justify-between text-sm"><p>VAT:</p> <p>{saleVat.toFixed(2)}</p></div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 border-gray-300 dark:border-gray-700"><p>Grand Total:</p> <p>{saleGrandTotal.toFixed(2)}</p></div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                          <input type="number" placeholder="Paid" value={salePaid} onChange={e=>setSalePaid(e.target.value)} className={`${inputClasses}`}/>
                          <div className={`p-3 border rounded-lg ${theme === 'light' ? 'bg-light-input border-gray-300' : 'bg-brand border-gray-700'}`}>Due: {saleDue.toFixed(2)}</div>
                      </div>
                      <textarea placeholder="Notes" value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/>
                      <div><input id="sale-photo" type="file" accept="image/*" onChange={e => handleFileChange(e, setSalePhoto)} className="hidden"/> <label htmlFor="sale-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div>
                  </div>
                  <div className="flex justify-between items-center mt-6">
                      <div>{editingSaleId && <button onClick={()=>promptDelete(editingSaleId, 'sale')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div>
                      <div className="flex gap-3"><button onClick={() => { editingSaleId ? (selectedParty ? switchView(View.PARTY_LEDGER) : switchView(View.DASHBOARD)) : switchView(View.DASHBOARD) }} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> <button onClick={handleAddSale} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingSaleId ? 'Update' : 'Save'}</button></div>
                  </div>
              </div>
          );
      case View.REPAIR_JOBS:
          return (
              <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md">
                  <div className="space-y-4">
                      <div><input type="date" value={repairDate} onChange={e=>setRepairDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(repairDate)}</p></div>
                      <select value={repairSupplier} onChange={e=>setRepairSupplier(e.target.value)} className={inputClasses}><option value="">Select Supplier</option>{parties.filter(p=>p.type !== 'customer').map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select>
                      <input type="text" placeholder="Customer Name" value={repairCustomer} onChange={e=>setRepairCustomer(e.target.value)} className={inputClasses}/>
                      <input type="tel" placeholder="Customer Phone" value={repairCustomerPhone} onChange={e=>setRepairCustomerPhone(e.target.value)} className={inputClasses}/>
                      <input type="text" placeholder="Problem*" value={repairProblem} onChange={e=>setRepairProblem(e.target.value)} className={inputClasses}/>
                      <div className="grid grid-cols-2 gap-4">
                          <input type="number" placeholder="Total*" value={repairTotal} onChange={e=>setRepairTotal(e.target.value)} className={inputClasses}/>
                          <input type="number" placeholder="Cost" value={repairCost} onChange={e=>setRepairCost(e.target.value)} className={inputClasses}/>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          <input type="number" placeholder="Paid" value={repairPaid} onChange={e=>setRepairPaid(e.target.value)} className={inputClasses}/>
                          <div className={`p-3 border rounded-lg ${theme === 'light' ? 'bg-light-input border-gray-300' : 'bg-brand-input-dark border-gray-600'}`}>Due: {repairDue.toFixed(2)}</div>
                          <div className={`p-3 border rounded-lg ${theme === 'light' ? 'bg-light-input border-gray-300' : 'bg-brand-input-dark border-gray-600'}`}>Profit: {repairProfit.toFixed(2)}</div>
                      </div>
                      <textarea placeholder="Notes" value={repairNotes} onChange={e=>setRepairNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/>
                      <div><input id="repair-photo" type="file" accept="image/*" onChange={e => handleFileChange(e, setRepairPhoto)} className="hidden"/> <label htmlFor="repair-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div>
                  </div>
                  <div className="flex justify-between items-center mt-6">
                      <div>{editingRepairId && <button onClick={()=>promptDelete(editingRepairId, 'repair')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div>
                      <div className="flex gap-3"><button onClick={() => switchView(editingRepairId ? View.RECORDS : View.DASHBOARD)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> <button onClick={handleAddRepairJob} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingRepairId ? 'Update' : 'Save'}</button></div>
                  </div>
              </div>
          );
      case View.EXPENSES:
        return ( <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4"> <div><input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(expenseDate)}</p></div> <input type="text" placeholder="Expense Title*" value={expenseTitle} onChange={e=>setExpenseTitle(e.target.value)} className={inputClasses}/> <div className="relative"><input type="text" placeholder="Amount*" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} className={`${inputClasses} pr-12`}/><button onClick={()=>handleCalculate(expenseAmount, setExpenseAmount)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Calculator size={20}/></button></div> <textarea placeholder="Notes" value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/> <div><input id="expense-photo" type="file" accept="image/*" onChange={e => handleFileChange(e, setExpensePhoto)} className="hidden"/> <label htmlFor="expense-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div> <div className="flex justify-between items-center mt-4"><div>{editingExpenseId && <button onClick={()=>promptDelete(editingExpenseId, 'expense')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div><div className="flex gap-3"><button onClick={()=>switchView(View.RECORDS)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> <button onClick={handleAddExpense} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingExpenseId ? 'Update' : 'Save'}</button></div></div> </div> );
      case View.PARTIES:
        const partyTypes: (PartyType | 'All')[] = ['All', 'customer', 'supplier', 'parts'];
          return ( <div> 
                <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-brand/80 rounded-xl mb-4 shadow-md">
                    <button onClick={() => {clearFormStates(View.ADD_PARTY); switchView(View.ADD_PARTY)}} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-3 flex-shrink-0">
                        <Plus size={20} />
                    </button>
                    <div className="relative w-full">
                        <input 
                            type="text" 
                            placeholder="Search parties..." 
                            value={partiesSearchTerm} 
                            onChange={(e) => setPartiesSearchTerm(e.target.value)} 
                            className="bg-gray-100 dark:bg-brand-input-dark w-full rounded-lg py-3 pl-4 pr-10 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400" />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                    </div>
                </div>

                <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4">
                    <div className="flex space-x-2"> {partyTypes.map(type => ( <button key={type} onClick={() => setPartiesFilterType(type)} className={`flex-1 py-2 px-1 text-sm font-semibold rounded-md transition-colors ${partiesFilterType === type ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-brand-input-dark text-gray-700 dark:text-gray-300'}`}>{type === 'parts' ? 'Parts & Accessories' : type.charAt(0).toUpperCase() + type.slice(1)}</button>))} </div> 
                </div>
                <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden"><ul className="divide-y divide-gray-200 dark:divide-gray-800">{filteredParties.map(party => { const balanceInfo = partyBalances[party.name] || { amount: 0, label: 'Settled', type: 'settled'}; return ( <li key={party.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between space-x-4"> <div onClick={() => { setSelectedParty(party); switchView(View.PARTY_LEDGER); }} className="flex-1 cursor-pointer"><p className="font-semibold text-gray-800 dark:text-gray-200">{party.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{party.type === 'parts' ? 'Parts & Accessories' : party.type.charAt(0).toUpperCase() + party.type.slice(1)}</p></div> <div onClick={() => { setSelectedParty(party); switchView(View.PARTY_LEDGER); }} className="text-right cursor-pointer"><p className={`font-semibold ${balanceInfo.type === 'receive' ? 'text-purple-500' : 'text-pink-500'}`}>{balanceInfo.amount.toFixed(2)}</p><p className="text-xs text-gray-500 dark:text-gray-400">{balanceInfo.label}</p></div> <button onClick={() => handleEditParty(party)} className="ml-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Edit size={16} /></button> </li>); })}</ul></div>
             </div> 
          );
      case View.PARTY_LEDGER:
          if (!selectedParty) return <div>No party selected.</div>;
           
           const filteredPartyLedger = processedPartyLedger.filter(entry => {
                if (!partyLedgerSearch) return true;
                const searchTerm = partyLedgerSearch.toLowerCase();
                return entry.description.toLowerCase().includes(searchTerm) ||
                       (entry.invoiceNumber && entry.invoiceNumber.toLowerCase().includes(searchTerm)) ||
                       (entry.notes && entry.notes.toLowerCase().includes(searchTerm)) ||
                       (entry.checkNo && entry.checkNo.toLowerCase().includes(searchTerm));
            });

          return (
            <div className="pb-24">
                <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md mb-4 printable-area">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">{selectedParty.name}</h1>
                            <p className="text-gray-600 dark:text-gray-400">{selectedParty.contact}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-bold ${currentBalanceInfo.label === 'To Receive' ? 'text-purple-500' : 'text-pink-500'}`}>{currentBalanceInfo.amount.toFixed(2)}</p>
                            <p className="text-sm">{currentBalanceInfo.label}</p>
                        </div>
                    </div>
                    <div className="relative no-print"><input type="text" placeholder="Search transactions, invoice#..." value={partyLedgerSearch} onChange={e => setPartyLedgerSearch(e.target.value)} className={`${inputThemeClasses} p-3 border rounded-lg w-full pr-10`} /><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /></div>
                </div>

                <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-x-auto printable-area">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-semibold">Date</th>
                                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-semibold">Particulars</th>
                                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-semibold">Invoice #</th>
                                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-semibold">Dr.</th>
                                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-semibold">Cr.</th>
                                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-semibold">Balance</th>
                                <th className="px-2 py-3 text-center no-print"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPartyLedger.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-8 text-gray-500">No transactions found.</td></tr>
                            ) : filteredPartyLedger.map(entry => (
                                <React.Fragment key={entry.id}>
                                    <tr className="border-b dark:border-gray-800">
                                        <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(entry.date)}</td>
                                        <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                                            <span>{(entry.transactionType === 'payment_in' || entry.transactionType === 'payment_out') ? 'Payment' : entry.description} {entry.photo && <Camera size={14} className="inline-block ml-1 text-gray-400" />}</span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{(entry.transactionType === 'payment_out' || entry.transactionType === 'payment_in') ? (entry.checkNo ? `CHQ: ${entry.checkNo}` : 'Cash') : (entry.invoiceNumber || '-')}</td>
                                        <td className="px-4 py-2 text-right font-mono text-red-500">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-green-500">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{entry.balance.toFixed(2)} {entry.balanceType}</td>
                                        <td className="px-2 py-2 text-center no-print"><button onClick={() => toggleLedgerRow(entry.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{expandedLedgerRows.has(entry.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></td>
                                    </tr>
                                    {expandedLedgerRows.has(entry.id) && (
                                    <tr className="bg-gray-50 dark:bg-brand-dark/50 no-print"><td colSpan={7} className="p-3">
                                        <div className="text-xs space-y-2 text-gray-800 dark:text-gray-300">
                                            {entry.notes && <div><strong>Notes:</strong> <span className="text-gray-600 dark:text-gray-400">{entry.notes}</span></div>}
                                            {entry.checkNo && entry.transactionType !== 'payment_out' && entry.transactionType !== 'payment_in' && <div><strong>CHQ No:</strong> <span className="text-gray-600 dark:text-gray-400">{entry.checkNo}</span></div>}
                                            {entry.photo && <div className="mt-2"><strong>Photo:</strong><img src={entry.photo} alt="Transaction photo" className="mt-1 rounded-lg max-w-xs max-h-40"/></div>}
                                            <div className="flex justify-end items-center gap-2 pt-2">
                                                {entry.originalRecordId && entry.transactionType !== 'opening_balance' && (
                                                     <button onClick={() => handleEditRecord(entry)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Edit Transaction"><Edit size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </td></tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40 no-print">
                    <div className="flex items-center justify-center space-x-2">
                        {selectedParty.type === 'customer' ? (
                            <>
                                <button onClick={() => { setPaymentContext(null); setPaymentInParty(selectedParty.name); setPaymentInAmount(String(currentBalanceInfo.amount > 0 ? currentBalanceInfo.amount : '')); clearFormStates(View.PAYMENT_IN); switchView(View.PAYMENT_IN); }} className="flex-1 bg-green-500 text-white py-3 rounded-full shadow-lg text-center font-semibold">Receive</button>
                                <button onClick={() => { setSalesReturnCustomer(selectedParty.name); clearFormStates(View.SALES_RETURN); switchView(View.SALES_RETURN);}} className="bg-orange-500 text-white p-3 rounded-full shadow-lg" title="Sales Return"><Plus size={24}/></button>
                                <button onClick={() => { setSaleCustomerName(selectedParty.name); setSalePhone(selectedParty.contact); clearFormStates(View.SALES); switchView(View.SALES);}} className="flex-1 bg-red-500 text-white py-3 rounded-full shadow-lg text-center font-semibold">Sale</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { clearFormStates('paymentOut'); setPaymentOutRecipient(selectedParty.name); setShowPaymentModal(true);}} className="flex-1 bg-red-500 text-white py-3 rounded-full shadow-lg text-center font-semibold">Payment Out</button>
                                <button onClick={() => { setPurchaseReturnSupplier(selectedParty.name); clearFormStates(View.PURCHASE_RETURN); switchView(View.PURCHASE_RETURN);}} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white p-3 rounded-full shadow-lg" title="Purchase Return"><Plus size={24}/></button>
                                <button onClick={() => { setPurchaseSupplier(selectedParty.name); setPurchaseSupplierSearch(selectedParty.name); clearFormStates(View.PURCHASE); switchView(View.PURCHASE); }} className="flex-1 bg-green-500 text-white py-3 rounded-full shadow-lg text-center font-semibold">Purchase</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
          );
      case View.PURCHASE_RETURN:
          return (
              <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4">
                  <div><input type="date" value={purchaseReturnDate} onChange={e=>setPurchaseReturnDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(purchaseReturnDate)}</p></div>
                  <input type="text" placeholder="Invoice No." value={purchaseReturnInvoice} onChange={e=>setPurchaseReturnInvoice(e.target.value)} className={inputClasses}/>
                  <div className="flex items-center gap-4"><label><input type="radio" name="returnType" value="Return" checked={purchaseReturnType==='Return'} onChange={()=>setPurchaseReturnType('Return')}/> Return</label><label><input type="radio" name="returnType" value="Debit" checked={purchaseReturnType==='Debit'} onChange={()=>setPurchaseReturnType('Debit')}/> Debit Note</label></div>
                  <select value={purchaseReturnSupplier} onChange={e=>setPurchaseReturnSupplier(e.target.value)} className={inputClasses}><option value="">Select Supplier*</option>{parties.filter(p=>p.type!=='customer').map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select>
                  <button onClick={() => switchView(View.ADD_ITEMS_TO_TRANSACTION, 'purchase_return')} className="w-full py-3 text-center bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">Add Items to Return</button> 
                  <textarea placeholder="Notes" value={purchaseReturnNotes} onChange={e=>setPurchaseReturnNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/>
                  <div><input id="return-photo" type="file" accept="image/*" onChange={e=>handleFileChange(e, setPurchaseReturnPhoto)} className="hidden"/><label htmlFor="return-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div>
                  <div className="flex justify-between items-center mt-6">
                      <div>{editingPurchaseReturnId && <button onClick={()=>promptDelete(editingPurchaseReturnId, 'purchase_return')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div>
                      <div className="flex gap-3"><button onClick={()=>switchView(View.PARTY_LEDGER)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button><button onClick={handleAddPurchaseReturn} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingPurchaseReturnId ? 'Update' : 'Save'}</button></div>
                  </div>
              </div>
          );
      case View.SALES_RETURN:
          return (
              <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4">
                  <div><input type="date" value={salesReturnDate} onChange={e=>setSalesReturnDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(salesReturnDate)}</p></div>
                  <input type="text" placeholder="Invoice No." value={salesReturnInvoice} onChange={e=>setSalesReturnInvoice(e.target.value)} className={inputClasses}/>
                  <div className="flex items-center gap-4"><label><input type="radio" name="returnType" value="Return" checked={salesReturnType==='Return'} onChange={()=>setSalesReturnType('Return')}/> Return</label><label><input type="radio" name="returnType" value="Credit" checked={salesReturnType==='Credit'} onChange={()=>setSalesReturnType('Credit')}/> Credit Note</label></div>
                  <select value={salesReturnCustomer} onChange={e=>setSalesReturnCustomer(e.target.value)} className={inputClasses}><option value="">Select Customer*</option>{parties.filter(p=>p.type === 'customer').map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select>
                  <button onClick={() => switchView(View.ADD_ITEMS_TO_TRANSACTION, 'sales_return')} className="w-full py-3 text-center bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">Add Items to Return</button> 
                  <textarea placeholder="Notes" value={salesReturnNotes} onChange={e=>setSalesReturnNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/>
                  <div><input id="return-photo" type="file" accept="image/*" onChange={e=>handleFileChange(e, setSalesReturnPhoto)} className="hidden"/><label htmlFor="return-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/> Add Photo</label></div>
                  <div className="flex justify-between items-center mt-6">
                      <div>{editingSalesReturnId && <button onClick={()=>promptDelete(editingSalesReturnId, 'sales_return')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div>
                      <div className="flex gap-3"><button onClick={()=>switchView(View.PARTY_LEDGER)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button><button onClick={handleAddSalesReturn} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingSalesReturnId ? 'Update' : 'Save'}</button></div>
                  </div>
              </div>
          );
      case View.PAYMENT_IN:
        return ( <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4"> <div><input type="date" value={paymentInDate} onChange={e=>setPaymentInDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(paymentInDate)}</p></div> <select value={paymentInParty} onChange={e=>setPaymentInParty(e.target.value)} className={inputClasses}><option value="">Select Customer*</option>{parties.filter(p=>p.type === 'customer').map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select> <input type="number" placeholder="Amount*" value={paymentInAmount} onChange={e=>setPaymentInAmount(e.target.value)} className={inputClasses}/> <div className="flex items-center gap-4"><label><input type="radio" name="pmIn" value="cash" checked={paymentInMethod === 'cash'} onChange={() => setPaymentInMethod('cash')} /> Cash</label><label><input type="radio" name="pmIn" value="check" checked={paymentInMethod === 'check'} onChange={() => setPaymentInMethod('check')} /> CHQ</label>{paymentInMethod === 'check' && <input type="text" placeholder="CHQ No." value={paymentInCheckNo} onChange={(e) => setPaymentInCheckNo(e.target.value)} className={`${inputClasses} p-2 flex-1`} />}</div> <textarea placeholder="Notes" value={paymentInNotes} onChange={(e) => setPaymentInNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}></textarea> <div><input id="paymentIn-photo" type="file" accept="image/*" onChange={e=>handleFileChange(e, setPaymentInPhoto)} className="hidden" /><label htmlFor="paymentIn-photo" className="cursor-pointer flex items-center gap-2 text-blue-500"><Camera size={20}/>Add Photo</label></div> <div className="flex justify-between items-center mt-4"><div>{editingPaymentInId && <button onClick={()=>promptDelete(editingPaymentInId, 'payment_in')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div><div className="flex gap-3"><button onClick={()=> selectedParty ? switchView(View.PARTY_LEDGER) : switchView(View.DASHBOARD) } className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button><button onClick={handleReceivePayment} className="py-2 px-4 rounded-lg bg-blue-600 text-white">{editingPaymentInId ? 'Update' : 'Save'}</button></div></div> </div> );
      case View.RECORDS: {
        const recordViews = [
            { id: 'sales', label: "Sales Records", icon: ReceiptText, data: filteredSalesData }, 
            { id: 'repairs', label: "Repair Records", icon: Wrench, data: filteredRepairsData }, 
            { id: 'expenses', label: "Expenses Records", icon: DollarSign, data: filteredExpensesData }, 
            { id: 'all_transactions', label: "All Transactions", icon: Book, data: filteredAllTransactionsData }, 
            {id: 'full_ledger', label: "Full Ledger", icon: Book}, 
            { id: 'pnl', label: "Profit & Loss", icon: Calculator }, 
            { id: 'tax', label: "Tax Report", icon: Calculator }
        ];

        if(activeRecordView === 'menu') {
            return (
                <div className="space-y-3">
                    {recordViews.map(({id, label, icon: Icon, data}) => {
                         let total = 0;
                         if (id === 'sales' && data) total = data.reduce((sum, item) => sum + item.totalAmount, 0);
                         if (id === 'expenses' && data) total = data.reduce((sum, item) => sum + item.amount, 0);
                         if (id === 'all_transactions' && data) total = data.reduce((sum, item) => sum + (item.totalAmount || item.amount), 0);
                        return (
                        <div key={id} onClick={() => setActiveRecordView(id as RecordType)} className="bg-white dark:bg-brand p-4 rounded-lg shadow-md flex items-center justify-between space-x-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="flex items-center space-x-4">
                                <Icon className="text-blue-500" size={24} />
                                <div>
                                    <p className="font-semibold text-lg">{label}</p>
                                    {(id === 'sales' || id === 'expenses' || id === 'all_transactions') && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total: {total.toFixed(2)}</p>
                                    )}
                                </div>
                            </div>
                            <ChevronDown className="transform -rotate-90" />
                        </div>
                    )})}
                </div>
            );
        }
        
        const renderRecordList = () => {
            let data: any[] = [];
            let title = '';
            
            if (activeRecordView === 'tax') {
                const handleApplyTaxFilter = () => {
                    setAppliedTaxFromDate(stagedTaxFromDate);
                    setAppliedTaxToDate(stagedTaxToDate);
                }
                const getPanForParty = (name: string) => parties.find(p => p.name === name)?.panNumber || '';
                
                const filteredSales = salesRecords.filter(r => {
                    const from = appliedTaxFromDate ? new Date(appliedTaxFromDate) : null;
                    const to = appliedTaxToDate ? new Date(appliedTaxToDate) : null;
                    if (from) from.setHours(0, 0, 0, 0);
                    if (to) to.setHours(23, 59, 59, 999);
                    const itemDate = new Date(r.date);
                    return (!from || itemDate >= from) && (!to || itemDate <= to);
                });
                const filteredSalesReturns = salesReturnRecords.filter(r => { const d = new Date(r.date); const from = appliedTaxFromDate ? new Date(appliedTaxFromDate) : null; const to = appliedTaxToDate ? new Date(appliedTaxToDate) : null; return (!from || d >= from) && (!to || d <= to);});
                const filteredPurchases = purchaseRecords.filter(r => { const d = new Date(r.date); const from = appliedTaxFromDate ? new Date(appliedTaxFromDate) : null; const to = appliedTaxToDate ? new Date(appliedTaxToDate) : null; return (!from || d >= from) && (!to || d <= to);});
                const filteredPurchaseReturns = purchaseReturnRecords.filter(r => { const d = new Date(r.date); const from = appliedTaxFromDate ? new Date(appliedTaxFromDate) : null; const to = appliedTaxToDate ? new Date(appliedTaxToDate) : null; return (!from || d >= from) && (!to || d <= to);});
                
                const summary = {
                    totalSales: filteredSales.reduce((sum, r) => sum + r.subTotal, 0),
                    totalSalesReturns: filteredSalesReturns.reduce((sum, r) => sum + r.subTotal, 0),
                    get taxableSales() { return this.totalSales - this.totalSalesReturns },
                    get outputVat() { return this.taxableSales * 0.13 },
                    totalPurchases: filteredPurchases.reduce((sum, r) => sum + r.subTotal, 0),
                    totalPurchaseReturns: filteredPurchaseReturns.reduce((sum, r) => sum + r.subTotal, 0),
                    get taxablePurchases() { return this.totalPurchases - this.totalPurchaseReturns },
                    get inputVat() { return this.taxablePurchases * 0.13 },
                    get netVatPayable() { return this.outputVat - this.inputVat },
                };
                
                 const getDownloadContextForTax = () => {
                    if (taxReportView === 'summary') {
                        return {
                            title: 'VAT Summary',
                            headers: ['Metric', 'Amount'],
                            data: Object.entries(summary),
                            csvFormatter: (d: any[]) => Object.entries(summary).map(([key, value]) => [key, typeof value === 'number' ? value.toFixed(2) : value])
                        };
                    } else if (taxReportView === 'sales') {
                        return {
                            title: 'Sales VAT Register',
                            headers: ["Date", "Invoice No", "Customer Name", "PAN", "Taxable Amount", "VAT Amount"],
                            data: filteredSales,
                            csvFormatter: (d: Sale[]) => d.map(s => [formatDate(s.date), s.invoiceNumber, s.customerName, getPanForParty(s.customerName), s.subTotal.toFixed(2), s.vatAmount.toFixed(2)])
                        };
                    } else { // purchase
                        return {
                            title: 'Purchase VAT Register',
                            headers: ["Date", "Bill No", "Supplier Name", "PAN", "Taxable Amount", "VAT Amount"],
                            data: filteredPurchases,
                            csvFormatter: (d: Purchase[]) => d.map(p => [formatDate(p.date), p.invoiceNumber, p.supplierName, getPanForParty(p.supplierName), p.subTotal.toFixed(2), p.vatAmount.toFixed(2)])
                        };
                    }
                };

                return (
                 <div id="tax-report-area">
                    <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4 no-print">
                        <div className="flex items-center mb-2 justify-between">
                             <button onClick={()=>{setActiveRecordView('menu'); setAppliedTaxFromDate(''); setStagedTaxFromDate(''); setAppliedTaxToDate(''); setStagedTaxToDate('');}} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"><ArrowLeft/></button>
                             <h2 className="text-xl font-bold">Tax Report</h2>
                            <button onClick={() => handleDownloadRequest(getDownloadContextForTax())} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Download size={18}/></button>
                        </div>
                         <div className="space-y-2">
                             <div className="grid grid-cols-2 gap-2">
                                <div><input type="date" value={stagedTaxFromDate} onChange={e=>setStagedTaxFromDate(e.target.value)} className={`${inputClasses} p-2`} /><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedTaxFromDate)}</p></div>
                                <div><input type="date" value={stagedTaxToDate} onChange={e=>setStagedTaxToDate(e.target.value)} className={`${inputClasses} p-2`} /><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedTaxToDate)}</p></div>
                            </div>
                            <button onClick={handleApplyTaxFilter} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold">Filter</button>
                         </div>
                         <div className="flex space-x-2 p-1 bg-gray-200 dark:bg-brand-dark rounded-lg mt-2">
                            <button onClick={() => setTaxReportView('summary')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${taxReportView === 'summary' ? 'bg-white dark:bg-brand shadow' : ''}`}>Summary</button>
                            <button onClick={() => setTaxReportView('sales')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${taxReportView === 'sales' ? 'bg-white dark:bg-brand shadow' : ''}`}>Sales Register</button>
                            <button onClick={() => setTaxReportView('purchase')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${taxReportView === 'purchase' ? 'bg-white dark:bg-brand shadow' : ''}`}>Purchase Register</button>
                        </div>
                    </div>

                    {taxReportView === 'summary' && (
                        <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md printable-area space-y-6">
                           <div>
                                <h3 className="text-lg font-semibold border-b pb-2 mb-2">VAT on Sales (Output VAT)</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Total Sales (Taxable)</span><span>{summary.totalSales.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>(-) Sales Returns (Taxable)</span><span>{summary.totalSalesReturns.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-semibold border-t pt-1"><span>Net Taxable Sales</span><span>{summary.taxableSales.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold text-green-500"><span>Output VAT (13%)</span><span>{summary.outputVat.toFixed(2)}</span></div>
                                </div>
                           </div>
                           <div>
                                <h3 className="text-lg font-semibold border-b pb-2 mb-2">VAT on Purchases (Input VAT)</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Total Purchases (Taxable)</span><span>{summary.totalPurchases.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>(-) Purchase Returns (Taxable)</span><span>{summary.totalPurchaseReturns.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-semibold border-t pt-1"><span>Net Taxable Purchases</span><span>{summary.taxablePurchases.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold text-red-500"><span>Input VAT (13%)</span><span>{summary.inputVat.toFixed(2)}</span></div>
                                </div>
                           </div>
                           <div className={`flex justify-between font-bold text-xl border-t-2 pt-3 mt-4 ${summary.netVatPayable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <span>Net VAT Payable</span><span>{summary.netVatPayable.toFixed(2)}</span>
                           </div>
                        </div>
                    )}
                     {(taxReportView === 'sales' || taxReportView === 'purchase') && (
                        <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-x-auto printable-area">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase">
                                   <tr>
                                       <th className="px-4 py-3">Date</th>
                                       <th className="px-4 py-3">{taxReportView === 'sales' ? 'Inv No' : 'Bill No'}</th>
                                       <th className="px-4 py-3">{taxReportView === 'sales' ? 'Customer' : 'Supplier'}</th>
                                       <th className="px-4 py-3">PAN</th>
                                       <th className="px-4 py-3 text-right">Amount</th>
                                       <th className="px-4 py-3 text-right">VAT</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {(taxReportView === 'sales' ? filteredSales : filteredPurchases).map((rec: Sale | Purchase) => (
                                       <tr key={rec.id} className="border-b dark:border-gray-800">
                                           <td className="px-4 py-2">{formatDate(rec.date)}</td>
                                           <td className="px-4 py-2">{rec.invoiceNumber}</td>
                                           <td className="px-4 py-2">{taxReportView === 'sales' ? (rec as Sale).customerName : (rec as Purchase).supplierName}</td>
                                           <td className="px-4 py-2">{getPanForParty(taxReportView === 'sales' ? (rec as Sale).customerName : (rec as Purchase).supplierName)}</td>
                                           <td className="px-4 py-2 text-right">{rec.subTotal.toFixed(2)}</td>
                                           <td className="px-4 py-2 text-right">{rec.vatAmount.toFixed(2)}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    )}
                 </div>
                );
            }

            if (activeRecordView === 'full_ledger') {
                const handleApplyFullLedgerFilter = () => {
                     setAppliedFullLedgerSearch(stagedFullLedgerSearch);
                     setAppliedFullLedgerFromDate(stagedFullLedgerFromDate);
                     setAppliedFullLedgerToDate(stagedFullLedgerToDate);
                     setAppliedFullLedgerPartyFilter(stagedFullLedgerPartyFilter);
                     setAppliedFullLedgerTypeFilter(stagedFullLedgerTypeFilter);
                };
                const netTotal = fullLedgerTotals.credit - fullLedgerTotals.debit;
                return (
                    <div>
                        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-brand-dark py-2 no-print">
                            <div className="flex items-center mb-2 justify-between">
                                <button onClick={()=>{setActiveRecordView('menu');}} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-brand"><ArrowLeft/></button>
                                <h2 className="text-xl font-bold">Full Ledger</h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowFilterPanel(f => !f)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Filter size={18}/></button>
                                    <button onClick={() => handleDownloadRequest({
                                        title: 'Full Ledger',
                                        headers: ['Date', 'Particulars', 'Invoice #', 'Debit', 'Credit'],
                                        data: filteredFullLedgerData,
                                        csvFormatter: (d: any[]) => d.map(e => [formatDate(e.date), e.description, e.invoiceNumber || (e.checkNo ? `CHQ: ${e.checkNo}` : ''), e.debit > 0 ? e.debit.toFixed(2) : '', e.credit > 0 ? e.credit.toFixed(2) : ''])
                                    })} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Download size={18}/></button>
                                </div>
                            </div>
                            {showFilterPanel && (
                                <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md space-y-2">
                                    <input type="text" placeholder="Search..." value={stagedFullLedgerSearch} onChange={e => setStagedFullLedgerSearch(e.target.value)} className={inputClasses}/>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><input type="date" value={stagedFullLedgerFromDate} onChange={e=>setStagedFullLedgerFromDate(e.target.value)} className={`${inputClasses} p-2 text-sm`} /><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedFullLedgerFromDate)}</p></div>
                                        <div><input type="date" value={stagedFullLedgerToDate} onChange={e=>setStagedFullLedgerToDate(e.target.value)} className={`${inputClasses} p-2 text-sm`} /><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedFullLedgerToDate)}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={stagedFullLedgerPartyFilter} onChange={e => setStagedFullLedgerPartyFilter(e.target.value)} className={`${inputClasses} text-sm`}>
                                            <option value="All">All Parties</option>
                                            {parties.filter(p => p.type !== 'customer').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </select>
                                        <select value={stagedFullLedgerTypeFilter} onChange={e => setStagedFullLedgerTypeFilter(e.target.value as any)} className={`${inputClasses} text-sm`}>
                                            <option value="All">All Transactions</option>
                                            {['purchase', 'purchase_return', 'payment_out', 'expense', 'opening_balance'].map(type => <option key={type} value={type}>{transactionTypeDisplayMap[type as TransactionType]}</option>)}
                                        </select>
                                    </div>
                                     <button onClick={handleApplyFullLedgerFilter} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold">Filter</button>
                                </div>
                            )}
                        </div>
                        <div className="bg-white dark:bg-brand p-3 my-4 rounded-lg shadow-md flex justify-between items-center printable-area">
                            <span className="font-semibold">Net Total:</span>
                            <span className={`font-bold text-lg ${netTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netTotal.toFixed(2)}</span>
                        </div>
                        <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-x-auto printable-area">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Particulars</th><th className="px-4 py-3">Inv #</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-2 py-3 no-print"></th></tr></thead>
                               <tbody>
                                   {filteredFullLedgerData.map(entry => (
                                       <Fragment key={entry.id}>
                                            <tr className="border-b dark:border-gray-800">
                                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(entry.date)}</td>
                                                <td className="px-4 py-2">{entry.description}</td>
                                                <td className="px-4 py-2">{entry.invoiceNumber || (entry.checkNo ? `CHQ: ${entry.checkNo}` : '') || '-'}</td>
                                                <td className="px-4 py-2 text-right font-mono text-red-500">{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
                                                <td className="px-4 py-2 text-right font-mono text-green-500">{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
                                                <td className="px-2 py-2 text-center no-print"><button onClick={() => toggleFullLedgerRow(entry.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{expandedFullLedgerRows.has(entry.id) ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></td>
                                            </tr>
                                            {expandedFullLedgerRows.has(entry.id) && (
                                                <tr className="bg-gray-50 dark:bg-brand-dark/50 no-print"><td colSpan={6} className="p-3 text-xs">
                                                    <div><strong>Party:</strong> {entry.partyName}</div>
                                                    {entry.notes && <div><strong>Notes:</strong> {entry.notes}</div>}
                                                    {entry.photo && <div className="mt-2"><strong>Photo:</strong><img src={entry.photo} alt="Transaction photo" className="mt-1 rounded-lg max-w-xs max-h-40"/></div>}
                                                    {entry.originalRecordId && entry.transactionType !== 'opening_balance' && (
                                                        <div className="flex justify-end items-center gap-2 pt-2">
                                                            <button onClick={() => handleEditRecord(entry)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1"><Edit size={14} /> Edit</button>
                                                            <button onClick={() => promptDelete(entry.originalRecordId!, entry.transactionType)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1 text-sm bg-red-500 text-white px-3 py-1"><Trash2 size={14} /> Delete</button>
                                                        </div>
                                                    )}
                                                </td></tr>
                                            )}
                                       </Fragment>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    </div>
                );
            }

            if (activeRecordView === 'pnl') {
                title = 'Profit & Loss Statement';
                const handleApplyPnlFilter = () => {
                    setAppliedPnlFromDate(stagedPnlFromDate);
                    setAppliedPnlToDate(stagedPnlToDate);
                }
                const filterByPnlDate = (record: any) => {
                    const from = appliedPnlFromDate ? new Date(appliedPnlFromDate) : null;
                    const to = appliedPnlToDate ? new Date(appliedPnlToDate) : null;
                    if (from) from.setHours(0,0,0,0);
                    if(to) to.setHours(23,59,59,999);
                    const itemDate = new Date(record.date);
                    return (!from || itemDate >= from) && (!to || itemDate <= to);
                };

                const relevantSales = salesRecords.filter(filterByPnlDate);
                const relevantRepairs = repairJobsRecords.filter(filterByPnlDate);
                const relevantPurchases = purchaseRecords.filter(filterByPnlDate);
                const relevantExpenses = expensesRecords.filter(filterByPnlDate);
                const relevantSalesReturns = salesReturnRecords.filter(filterByPnlDate);
                const relevantPurchaseReturns = purchaseReturnRecords.filter(filterByPnlDate);

                const totalSales = relevantSales.reduce((sum, s) => sum + s.totalAmount, 0);
                const totalRepairs = relevantRepairs.reduce((sum, r) => sum + r.total, 0);
                const totalSalesReturns = relevantSalesReturns.reduce((sum, sr) => sum + sr.totalAmount, 0);
                const totalRevenue = totalSales + totalRepairs - totalSalesReturns;
                
                const totalPurchases = relevantPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
                const totalRepairCosts = relevantRepairs.reduce((sum, r) => sum + r.cost, 0);
                const totalExpenses = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
                const totalPurchaseReturns = relevantPurchaseReturns.reduce((sum, pr) => sum + pr.totalAmount, 0);
                const totalCosts = totalPurchases + totalRepairCosts + totalExpenses - totalPurchaseReturns;
                
                const netProfit = totalRevenue - totalCosts;

                return (<div>
                    <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4 no-print">
                        <div className="flex items-center mb-2 justify-between">
                            <button onClick={()=>{setActiveRecordView('menu'); setStagedPnlFromDate(''); setAppliedPnlFromDate(''); setStagedPnlToDate(''); setAppliedPnlToDate('');}} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"><ArrowLeft/></button>
                            <h2 className="text-xl font-bold">{title}</h2>
                             <button onClick={() => handleDownloadRequest({
                                title: 'Profit and Loss',
                                headers: ['Category', 'Item', 'Amount'],
                                data: [], // P&L data is complex, CSV might need custom format
                                csvFormatter: () => [
                                    ['Income', 'Sales', totalSales.toFixed(2)],
                                    ['Income', 'Repairs', totalRepairs.toFixed(2)],
                                    ['Income', 'Sales Returns (-)', -totalSalesReturns.toFixed(2)],
                                    ['', 'Total Revenue', totalRevenue.toFixed(2)],
                                    ['Costs', 'Purchases', totalPurchases.toFixed(2)],
                                    ['Costs', 'Repair Costs', totalRepairCosts.toFixed(2)],
                                    ['Costs', 'Expenses', totalExpenses.toFixed(2)],
                                    ['Costs', 'Purchase Returns (-)', -totalPurchaseReturns.toFixed(2)],
                                    ['', 'Total Costs', totalCosts.toFixed(2)],
                                    ['', 'Net Profit/Loss', netProfit.toFixed(2)],
                                ]
                            })} className="flex items-center gap-2 text-sm py-1 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"><Download size={16}/> Download</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2"><div><input type="date" value={stagedPnlFromDate} onChange={e=>setStagedPnlFromDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="From"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedPnlFromDate)}</p></div> <div><input type="date" value={stagedPnlToDate} onChange={e=>setStagedPnlToDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="To"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedPnlToDate)}</p></div></div>
                        <button onClick={handleApplyPnlFilter} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold">Filter</button>
                    </div>
                    <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4 printable-area">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold border-b pb-2">Income</h3>
                            <div className="flex justify-between"><span>Sales</span> <span>{totalSales.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Repairs</span> <span>{totalRepairs.toFixed(2)}</span></div>
                            <div className="flex justify-between text-red-500"><span>(-) Sales Returns</span> <span>{totalSalesReturns.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>Total Revenue</span> <span>{totalRevenue.toFixed(2)}</span></div>
                        </div>
                         <div className="space-y-2">
                            <h3 className="text-lg font-semibold border-b pb-2">Costs & Expenses</h3>
                            <div className="flex justify-between"><span>Purchases</span> <span>{totalPurchases.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Repair Costs</span> <span>{totalRepairCosts.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Expenses</span> <span>{totalExpenses.toFixed(2)}</span></div>
                             <div className="flex justify-between text-green-500"><span>(-) Purchase Returns</span> <span>{totalPurchaseReturns.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>Total Costs</span> <span>{totalCosts.toFixed(2)}</span></div>
                        </div>
                        <div className={`flex justify-between font-bold text-2xl border-t-2 pt-3 mt-4 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <span>Net Profit / Loss</span>
                            <span>{netProfit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>);
            }

            let filteredData: any[] = [];
            let csvHeaders: string[] = [];
            let csvFormatter: (d: any[]) => any[][] = () => [];

            const handleApplyGeneralFilter = () => {
                setAppliedRecordsSearch(stagedRecordsSearch);
                setAppliedFilterFromDate(stagedFilterFromDate);
                setAppliedFilterToDate(stagedFilterToDate);
                if (activeRecordView === 'all_transactions') {
                    setAppliedAllTransactionsTypeFilter(stagedAllTransactionsTypeFilter);
                    setAppliedAllTransactionsBrandFilter(stagedAllTransactionsBrandFilter);
                }
            };
            
            if (activeRecordView === 'sales') { 
                data = salesRecords; 
                title = 'Sales Records'; 
                filteredData = filteredSalesData;
                csvHeaders = ['Date', 'Customer', 'Invoice', 'Total', 'Paid', 'Due'];
                csvFormatter = (d: Sale[]) => d.map(i => [formatDate(i.date), i.customerName, i.invoiceNumber, i.totalAmount.toFixed(2), i.paid.toFixed(2), i.due.toFixed(2)]);
            } else if (activeRecordView === 'repairs') { 
                data = repairJobsRecords; 
                title = 'Repair Records'; 
                filteredData = filteredRepairsData;
                csvHeaders = ['Date', 'Customer', 'Problem', 'Total', 'Cost', 'Paid', 'Profit', 'Due'];
                csvFormatter = (d: RepairJob[]) => d.map(i => [formatDate(i.date), i.customerName, i.problem, i.total.toFixed(2), i.cost.toFixed(2), i.paid.toFixed(2), i.profit.toFixed(2), i.due.toFixed(2)]);
            } else if (activeRecordView === 'expenses') { 
                data = expensesRecords; 
                title = 'Expense Records'; 
                filteredData = filteredExpensesData;
                csvHeaders = ['Date', 'Title', 'Amount'];
                csvFormatter = (d: Expense[]) => d.map(i => [formatDate(i.date), i.title, i.amount.toFixed(2)]);
            } else if (activeRecordView === 'all_transactions') {
                title = 'All Transactions';
                filteredData = filteredAllTransactionsData;
                csvHeaders = ['Date', 'Type', 'Party/Title', 'Amount'];
                csvFormatter = (d: any[]) => d.map(i => [formatDate(i.date), i.recordType, i.partyName || i.title, (i.totalAmount || i.amount).toFixed(2)]);
            }
            
            const repairSummary = activeRecordView === 'repairs' ? {
                totalRevenue: filteredData.reduce((sum, job) => sum + job.total, 0),
                totalProfit: filteredData.reduce((sum, job) => sum + job.profit, 0),
            } : null;
            
            const listTotal = filteredData.reduce((sum, item) => sum + (item.totalAmount || item.amount || 0), 0);
            
            return (<div>
                <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4 no-print">
                    <div className="flex items-center mb-2 justify-between">
                        <div className="flex items-center">
                            <button onClick={()=>{setActiveRecordView('menu'); setStagedRecordsSearch(''); setAppliedRecordsSearch(''); setStagedFilterFromDate(''); setAppliedFilterFromDate(''); setStagedFilterToDate(''); setAppliedFilterToDate('');}} className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"><ArrowLeft/></button>
                            <h2 className="text-xl font-bold">{title}</h2>
                        </div>
                        <button onClick={() => handleDownloadRequest({ title, data: filteredData, headers: csvHeaders, csvFormatter})} className="flex items-center gap-2 text-sm py-1 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"><Download size={16}/> Download</button>
                    </div>

                    <input type="text" placeholder="Search..." value={stagedRecordsSearch} onChange={e=>setStagedRecordsSearch(e.target.value)} className={`${inputClasses} mb-2`}/>
                    <button onClick={()=>setShowFilterPanel(!showFilterPanel)} className={`w-full p-2 text-left rounded-md text-sm mb-2 flex items-center gap-2 ${theme === 'light' ? 'bg-gray-200' : 'bg-brand'}`}><Filter size={16}/> Filter by Date / Type / Brand</button>
                    {showFilterPanel && <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2"><div><input type="date" value={stagedFilterFromDate} onChange={e=>setStagedFilterFromDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="From"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedFilterFromDate)}</p></div> <div><input type="date" value={stagedFilterToDate} onChange={e=>setStagedFilterToDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="To"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedFilterToDate)}</p></div></div>
                        {activeRecordView === 'all_transactions' && (
                            <div className="grid grid-cols-2 gap-2">
                               <select value={stagedAllTransactionsTypeFilter} onChange={e => setStagedAllTransactionsTypeFilter(e.target.value as any)} className={`${inputClasses} text-sm`}>
                                   <option value="All">All Types</option>
                                   {Object.keys(transactionTypeDisplayMap).filter(t => t!=='party').map(type => <option key={type} value={type}>{transactionTypeDisplayMap[type as TransactionType]}</option>)}
                               </select>
                               <select value={stagedAllTransactionsBrandFilter} onChange={e => setStagedAllTransactionsBrandFilter(e.target.value)} className={`${inputClasses} text-sm`}>
                                   <option value="All">All Brands</option>
                                   {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                               </select>
                            </div>
                        )}
                        <button onClick={handleApplyGeneralFilter} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold">Filter</button>
                    </div>}
                </div>
                 {repairSummary && (
                    <div className="p-4 bg-white dark:bg-brand rounded-lg mb-4 grid grid-cols-2 gap-4 shadow-md printable-area">
                        <div><p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p><p className="text-xl font-bold text-green-500">{repairSummary.totalRevenue.toFixed(2)}</p></div>
                        <div><p className="text-sm text-gray-500 dark:text-gray-400">Total Profit</p><p className="text-xl font-bold text-blue-500">{repairSummary.totalProfit.toFixed(2)}</p></div>
                    </div>
                )}
                { (activeRecordView === 'sales' || activeRecordView === 'expenses' || activeRecordView === 'all_transactions') && (
                     <div className="bg-white dark:bg-brand p-3 my-4 rounded-lg shadow-md flex justify-between items-center printable-area">
                        <span className="font-semibold text-lg">Net Total:</span>
                        <span className="font-bold text-xl text-green-500">{listTotal.toFixed(2)}</span>
                    </div>
                )}
                <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden printable-area">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredData.length === 0 ? <li className="p-8 text-center text-gray-500">No records found.</li> : filteredData.map((item: any) => (
                            <li key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800" >
                                 {activeRecordView === 'sales' && ( <div className="flex justify-between items-center" onClick={() => handleEditRecord({ transactionType: 'sale', originalRecordId: item.id })}> <div><p className="font-semibold">{item.customerName || 'Cash Sale'}</p><p className="text-sm text-gray-500">{formatDate(item.date)}</p></div> <div className="text-right"><p className="font-bold">{item.totalAmount.toFixed(2)}</p>{item.due > 0 && <p className="text-xs text-red-500">Due: {item.due.toFixed(2)}</p>}</div> </div> )}
                                 {activeRecordView === 'repairs' && (
                                    <div>
                                        <div onClick={() => handleEditRepairJob(item)} className="cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <div><p className="font-semibold">{item.customerName || 'N/A'}</p><p className="text-sm text-gray-500">{item.problem}</p></div>
                                                <div className="text-right"><p className="font-bold text-lg">{item.total.toFixed(2)}</p><p className="text-xs text-gray-400">{formatDate(item.date)}</p></div>
                                            </div>
                                            <div className="text-xs grid grid-cols-4 gap-2 text-center my-2">
                                                <div className="bg-gray-100 dark:bg-brand-input-dark p-1 rounded">Cost: <span className="font-semibold">{item.cost.toFixed(2)}</span></div>
                                                <div className="bg-gray-100 dark:bg-brand-input-dark p-1 rounded">Paid: <span className="font-semibold">{item.paid.toFixed(2)}</span></div>
                                                <div className="bg-green-100 dark:bg-green-900/50 p-1 rounded text-green-700 dark:text-green-400">Profit: <span className="font-semibold">{item.profit.toFixed(2)}</span></div>
                                                <div className="bg-red-100 dark:bg-red-900/50 p-1 rounded text-red-700 dark:text-red-400">Due: <span className="font-semibold">{item.due.toFixed(2)}</span></div>
                                            </div>
                                        </div>
                                        {item.due > 0 && item.customerName && <div className="flex justify-end mt-2"><button onClick={(e) => { e.stopPropagation(); setPaymentContext({ recordId: item.id, partyName: item.customerName, dueAmount: item.due, type: 'repair' }); setPaymentInParty(item.customerName); setPaymentInAmount(String(item.due)); clearFormStates(View.PAYMENT_IN); switchView(View.PAYMENT_IN); }} className="text-xs py-1 px-3 rounded-md bg-green-500 text-white">Receive Payment</button></div>}
                                    </div>
                                 )}
                                 {activeRecordView === 'expenses' && ( <div className="flex justify-between items-center" onClick={() => handleEditRecord({ transactionType: 'expense', originalRecordId: item.id })}> <div><p className="font-semibold">{item.title}</p><p className="text-sm text-gray-500">{formatDate(item.date)}</p></div> <p className="font-bold">{item.amount.toFixed(2)}</p> </div> )}
                                 {activeRecordView === 'all_transactions' && (
                                     <div className="flex justify-between items-start" onClick={() => handleEditRecord({ transactionType: item.recordType, originalRecordId: item.id })}>
                                         <div>
                                            <p className="font-semibold capitalize">{item.recordType.replace('_', ' ')}: {item.partyName || item.title}</p>
                                            <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
                                         </div>
                                         <p className="font-bold">{ (item.totalAmount || item.amount).toFixed(2) }</p>
                                     </div>
                                 )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>);
        };
        
        return renderRecordList();
      }
      case View.BEST_SELLING_PRODUCTS: {
        const handleApplyBestSellingFilter = () => {
            setAppliedBestSellingFromDate(stagedBestSellingFromDate);
            setAppliedBestSellingToDate(stagedBestSellingToDate);
            setAppliedBestSellingBrandFilter(stagedBestSellingBrandFilter);
        };

        const filteredSales = salesRecords.filter(sale => {
            const from = appliedBestSellingFromDate ? new Date(appliedBestSellingFromDate) : null;
            const to = appliedBestSellingToDate ? new Date(appliedBestSellingToDate) : null;
            const itemDate = new Date(sale.date);
            if(from) from.setHours(0,0,0,0);
            if(to) to.setHours(23,59,59,999);
            return (!from || itemDate >= from) && (!to || itemDate <= to);
        });

        const itemSales: {[key: string]: {item: InventoryItem, quantity: number, revenue: number}} = {};

        filteredSales.forEach(sale => {
            sale.items.forEach(transactionItem => {
                if(transactionItem.itemId) {
                    const inventoryItem = inventoryItems.find(i => i.id === transactionItem.itemId);
                    if (inventoryItem) {
                        if (appliedBestSellingBrandFilter !== 'All' && inventoryItem.category !== appliedBestSellingBrandFilter) {
                            return;
                        }
                        if (itemSales[transactionItem.itemId]) {
                            itemSales[transactionItem.itemId].quantity += transactionItem.quantity;
                            itemSales[transactionItem.itemId].revenue += transactionItem.total;
                        } else {
                            itemSales[transactionItem.itemId] = { item: inventoryItem, quantity: transactionItem.quantity, revenue: transactionItem.total };
                        }
                    }
                }
            });
        });

        const sortedItems = Object.values(itemSales).sort((a,b) => b.quantity - a.quantity);
        
        return (
            <div>
                 <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div><input type="date" value={stagedBestSellingFromDate} onChange={e=>setStagedBestSellingFromDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="From"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedBestSellingFromDate)}</p></div>
                        <div><input type="date" value={stagedBestSellingToDate} onChange={e=>setStagedBestSellingToDate(e.target.value)} className={`${inputClasses} p-2`} placeholder="To"/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(stagedBestSellingToDate)}</p></div>
                    </div>
                    <select value={stagedBestSellingBrandFilter} onChange={e => setStagedBestSellingBrandFilter(e.target.value)} className={`${inputClasses} text-sm`}>
                       <option value="All">All Brands</option>
                       {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                   <button onClick={handleApplyBestSellingFilter} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold">Filter</button>
                 </div>
                 <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {sortedItems.length === 0 ? <li className="p-8 text-center text-gray-500">No sales data for selected period.</li> : sortedItems.map(({item, quantity, revenue}, index) => (
                           <li key={item.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-gray-500">Revenue: {revenue.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-blue-500">{quantity} <span className="text-sm font-normal">units</span></p>
                                </div>
                           </li>
                        ))}
                    </ul>
                 </div>
            </div>
        )
      }
      case View.INVENTORY: {
        const categories = ['All', ...itemCategories];
        const subCategories = ['All', 'Smartphone', 'Accessories'];

        const filteredItems = inventoryItems.filter(item => {
            const searchMatch = inventorySearch ? item.name.toLowerCase().includes(inventorySearch.toLowerCase()) : true;
            const categoryMatch = inventoryCategoryFilter === 'All' ? true : item.category === inventoryCategoryFilter;
            const subCategoryMatch = inventorySubCategoryFilter === 'All' ? true : item.subCategory === inventorySubCategoryFilter;
            return searchMatch && categoryMatch && subCategoryMatch;
        });

        return (
            <div>
                 <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-brand/80 rounded-xl mb-4 shadow-md">
                    <button onClick={() => { clearFormStates(View.ADD_ITEM); switchView(View.ADD_ITEM); }} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-3 flex-shrink-0">
                        <Plus size={20} />
                    </button>
                    <div className="relative w-full">
                        <input 
                            type="text" 
                            placeholder="Search items..." 
                            value={inventorySearch} 
                            onChange={e => setInventorySearch(e.target.value)}
                            className="bg-gray-100 dark:bg-brand-input-dark w-full rounded-lg py-3 pl-4 pr-10 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400" />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                    </div>
                </div>
                <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <select value={inventoryCategoryFilter} onChange={e => setInventoryCategoryFilter(e.target.value)} className={inputClasses}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={inventorySubCategoryFilter} onChange={e => setInventorySubCategoryFilter(e.target.value as any)} className={inputClasses}>
                            {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                        </select>
                    </div>
                </div>
                <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredItems.map(item => (
                            <li key={item.id} onClick={() => { setSelectedInventoryItem(item); switchView(View.PRODUCT_TRANSACTION_HISTORY); }} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between space-x-4 cursor-pointer">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-gray-500">Price: {item.purchasePrice.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-lg ${item.quantity > 5 ? 'text-green-500' : (item.quantity > 0 ? 'text-orange-500' : 'text-red-500')}`}>{item.quantity} units</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleEditInventoryItem(item); }} className="ml-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Edit size={16} /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )
      }
      case View.ADD_ITEM: {
        const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const price = parseFloat(e.target.value) || 0;
            setItemPrice(e.target.value);
            setItemPriceIncTax((price * 1.13).toFixed(2));
        };
         const handlePriceIncTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const priceIncTax = parseFloat(e.target.value) || 0;
            setItemPriceIncTax(e.target.value);
            setItemPrice((priceIncTax / 1.13).toFixed(2));
        };

        return(
            <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4">
                <input type="text" placeholder="Item Name*" value={itemName} onChange={e=>setItemName(e.target.value)} className={inputClasses}/>
                 <div className="relative">
                    <input type="text" placeholder="IMEI Number (optional)" value={itemImei} onChange={e=>setItemImei(e.target.value)} className={`${inputClasses} pr-12`}/>
                    <button onClick={()=>alert('Camera Scan not implemented yet.')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ScanLine size={20}/></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Price (ex. Tax)" value={itemPrice} onChange={handlePriceChange} className={inputClasses}/>
                    <input type="number" placeholder="Price (inc. 13% Tax)" value={itemPriceIncTax} onChange={handlePriceIncTaxChange} className={inputClasses}/>
                </div>
                 <select value={itemCategory} onChange={e=>setItemCategory(e.target.value)} className={inputClasses}>
                     <option value="">Select Category*</option>
                     {itemCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 {isAddingCategory ? (
                     <div className="flex gap-2">
                         <input type="text" placeholder="New Category Name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className={inputClasses}/>
                         <button onClick={handleAddNewCategory} className="py-2 px-4 rounded-lg bg-green-600 text-white">Add</button>
                     </div>
                 ) : (
                    <button onClick={() => setIsAddingCategory(true)} className="text-sm text-blue-500 hover:underline">+ Add New Category</button>
                 )}
                 <select value={itemSubCategory} onChange={e=>setItemSubCategory(e.target.value as any)} className={inputClasses}>
                     <option value="Smartphone">Smartphone</option>
                     <option value="Accessories">Accessories</option>
                 </select>

                <div className="flex justify-between items-center mt-4">
                    <div>{editingInventoryItem && <button onClick={()=>promptDelete(editingInventoryItem.id, 'inventory')} className="py-2 px-4 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>}</div>
                    <div className="flex gap-3">
                        <button onClick={()=>switchView(previousView)} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button> 
                        <button onClick={handleSaveInventoryItem} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingInventoryItem ? 'Update' : 'Save'}</button>
                    </div>
                </div>
            </div>
        )
      }
      case View.ADD_ITEMS_TO_TRANSACTION: {
        const filteredItems = inventoryItems.filter(item => item.name.toLowerCase().includes(addItemsSearch.toLowerCase()));
        
        const handleSelectItem = (item: InventoryItem) => {
             setTempSelectedItems(prev => {
                const newMap = new Map(prev);
                if (newMap.has(item.id)) {
                } else {
                    newMap.set(item.id, 1);
                }
                return newMap;
            });
        };

        const updateItemQuantity = (itemId: string, change: number) => {
            setTempSelectedItems(prev => {
                const newMap = new Map(prev);
                const currentQty = newMap.get(itemId) || 0;
                const newQty = currentQty + change;
                if (newQty > 0) {
                    newMap.set(itemId, newQty);
                } else {
                    newMap.delete(itemId);
                }
                return newMap;
            });
        };

        const handleDoneSelection = () => {
            const transactionItems: TransactionItem[] = [];
            tempSelectedItems.forEach((quantity, itemId) => {
                const item = inventoryItems.find(i => i.id === itemId);
                if (item) {
                    const rate = item.purchasePrice; 
                    transactionItems.push({ itemId: item.id, name: item.name, quantity: quantity, rate: rate, tax: 13, total: rate * quantity });
                }
            });
            setCurrentTransactionItems(transactionItems);
            switchView(View.CONFIRM_TRANSACTION_ITEMS);
        };

        return (
            <div className="relative pb-24">
                 <div className="bg-white dark:bg-brand p-2 rounded-lg shadow-md mb-4 flex items-center gap-2">
                    <button onClick={() => { clearFormStates(View.ADD_ITEM); switchView(View.ADD_ITEM); }} className="p-3 bg-blue-500 text-white rounded-lg"><Plus size={20}/></button>
                    <div className="relative flex-1">
                        <input type="text" placeholder="Search items..." value={addItemsSearch} onChange={e => setAddItemsSearch(e.target.value)} className={`${inputThemeClasses} p-3 border rounded-lg w-full pr-10`}/>
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                 </div>
                 <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden mb-4">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredItems.map(item => {
                            const isSelected = tempSelectedItems.has(item.id);
                            const quantity = tempSelectedItems.get(item.id);

                            return (
                            <li key={item.id} onClick={() => !isSelected && handleSelectItem(item)} className={`p-4 flex items-center justify-between space-x-4 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'}`}>
                                <div className="flex-1">
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-gray-500">Price: {item.purchasePrice.toFixed(2)}</p>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <p className={`font-semibold ${item.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>{item.quantity} in stock</p>
                                    {isSelected ? (
                                        <div className="flex items-center gap-2 bg-blue-500 text-white rounded-full p-1">
                                            <button onClick={() => updateItemQuantity(item.id, -1)} className="p-1 rounded-full hover:bg-blue-600"><Minus size={16}/></button>
                                            <span className="font-bold w-4 text-center">{quantity}</span>
                                            <button onClick={() => updateItemQuantity(item.id, 1)} className="p-1 rounded-full hover:bg-blue-600"><Plus size={16}/></button>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-full"></div>
                                    )}
                                </div>
                            </li>
                        )})}
                    </ul>
                 </div>
                 {tempSelectedItems.size > 0 && (
                     <button onClick={handleDoneSelection} className="fixed bottom-24 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 z-40 flex items-center gap-2">
                         <Check size={24}/> Done ({tempSelectedItems.size})
                     </button>
                 )}
            </div>
        )
      }
      case View.CONFIRM_TRANSACTION_ITEMS: {
        const handleUpdateItem = (index: number, newRate?: number, newQty?: number) => {
            setCurrentTransactionItems(prev => {
                const newItems = [...prev];
                const item = {...newItems[index]};

                const qty = newQty !== undefined ? newQty : item.quantity;
                const rate = newRate !== undefined ? newRate : item.rate;

                if(qty <= 0) { 
                    newItems.splice(index, 1);
                    return newItems;
                }

                item.quantity = qty;
                item.rate = rate;
                item.total = rate * qty;
                newItems[index] = item;
                
                if (currentTransactionType === 'purchase' && newRate !== undefined && item.itemId) {
                    setInventoryItems(prevInv => prevInv.map(invItem => 
                        invItem.id === item.itemId ? { ...invItem, purchasePrice: rate, purchasePriceIncTax: rate * 1.13 } : invItem
                    ));
                }
                return newItems;
            });
        };

        const handleConfirm = () => {
            switch(currentTransactionType) {
                case 'sale': switchView(View.SALES); break;
                case 'purchase': switchView(View.PURCHASE); break;
                case 'sales_return': switchView(View.SALES_RETURN); break;
                case 'purchase_return': switchView(View.PURCHASE_RETURN); break;
                default: switchView(View.DASHBOARD);
            }
        }

        const subTotal = currentTransactionItems.reduce((sum, item) => sum + item.total, 0);
        const totalTax = currentTransactionItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
        const grandTotal = subTotal + totalTax;
        const totalUnits = currentTransactionItems.reduce((sum, item) => sum + item.quantity, 0);

        return (
            <div className="pb-24">
                <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md mb-4">
                    <div className="flex justify-between font-semibold">
                        <p>Total Amount:</p>
                        <p>{grandTotal.toFixed(2)}</p>
                    </div>
                     <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <p>Sub Total (Ex. VAT):</p>
                        <p>{subTotal.toFixed(2)}</p>
                    </div>
                     <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <p>Tax Amount:</p>
                        <p>{totalTax.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <p>Total Units:</p>
                        <p>{totalUnits}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {currentTransactionItems.map((item, index) => (
                        <div key={item.itemId || index} className="bg-white dark:bg-brand p-3 rounded-lg shadow-md space-y-2">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold">{item.name}</p>
                                <button onClick={() => handleUpdateItem(index, undefined, 0)}><X size={18} className="text-red-500"/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm">Qty:</label>
                                    <input type="number" value={item.quantity} onChange={e => handleUpdateItem(index, undefined, parseFloat(e.target.value) || 0)} className={`${inputClasses} p-2 text-center`}/>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm">Rate:</label>
                                    <input type="number" value={item.rate.toFixed(2)} onChange={e => handleUpdateItem(index, parseFloat(e.target.value) || 0, undefined)} className={`${inputClasses} p-2`}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleConfirm} className="fixed bottom-24 right-6 bg-green-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-green-700 z-40 flex items-center gap-2">OK</button>
            </div>
        )
      }
      case View.PRODUCT_TRANSACTION_HISTORY: {
        if (!selectedInventoryItem) return <div>No item selected</div>;
        
        const history = [
          ...salesRecords.filter(s => s.items.some(i => i.itemId === selectedInventoryItem.id)).map(s => ({...s, type: 'Sale', date: s.date, partyName: s.customerName})),
          ...purchaseRecords.filter(p => p.items.some(i => i.itemId === selectedInventoryItem.id)).map(p => ({...p, type: 'Purchase', date: p.date, partyName: p.supplierName})),
          ...salesReturnRecords.filter(sr => sr.items.some(i => i.itemId === selectedInventoryItem.id)).map(sr => ({...sr, type: 'Sales Return', date: sr.date, partyName: sr.customerName})),
          ...purchaseReturnRecords.filter(pr => pr.items.some(i => i.itemId === selectedInventoryItem.id)).map(pr => ({...pr, type: 'Purchase Return', date: pr.date, partyName: pr.supplierName})),
        ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div>
                 <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md mb-4">
                     <div className="flex justify-between items-start">
                         <div>
                            <h2 className="text-xl font-bold">{selectedInventoryItem.name}</h2>
                            <p className="text-sm text-gray-500">{selectedInventoryItem.category} - {selectedInventoryItem.subCategory}</p>
                         </div>
                         <div className="text-right">
                             <p className={`font-bold text-2xl ${selectedInventoryItem.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>{selectedInventoryItem.quantity}</p>
                             <p className="text-sm">In Stock</p>
                         </div>
                     </div>
                 </div>
                 <div className="bg-white dark:bg-brand rounded-lg shadow-md overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {history.length === 0 ? <li className="p-8 text-center text-gray-500">No transaction history for this item.</li> : history.map(t => {
                            const itemInTransaction = t.items.find(i => i.itemId === selectedInventoryItem.id);
                            return (
                                <li key={`${t.type}-${t.id}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => handleEditRecord({originalRecordId: t.id, transactionType: t.type.toLowerCase().replace(' ', '_') as TransactionType})}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{t.type} to/from {t.partyName}</p>
                                            <p className="text-sm text-gray-500">{formatDate(t.date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold ${t.type.includes('Purchase') ? 'text-red-500' : 'text-green-500'}`}>{itemInTransaction?.quantity} units</p>
                                            <p className="text-xs text-gray-500">@ {itemInTransaction && typeof itemInTransaction.rate === 'number' ? itemInTransaction.rate.toFixed(2) : 'N/A'}</p>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                 </div>
            </div>
        )
      }
      case View.SETTINGS:
        return (
            <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-md space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-brand-dark rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">App Lock</h3>
                    {isPinSet ? (
                        <div className="flex items-center justify-between">
                            <p>PIN is enabled.</p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowPinModal(true)} className="py-2 px-4 rounded-lg bg-blue-600 text-white flex items-center gap-2 text-sm"><Lock size={16}/> Change PIN</button>
                                <button onClick={handleDeletePin} className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowPinModal(true)} className="w-full text-left p-4 flex items-center gap-4 bg-gray-100 dark:bg-brand-input-dark rounded-lg hover:bg-gray-200 dark:hover:bg-brand">
                            <KeyRound size={20} className="text-blue-500" />
                            <span>Create PIN</span>
                        </button>
                    )}
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-brand-dark rounded-lg space-y-3">
                    <h3 className="font-semibold text-lg">Google Drive Sync</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Status: {syncStatus}</div>
                    {isLoggedInToGoogle ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={restoreDataFromDrive} className="flex-1 py-2 px-4 rounded-lg bg-green-600 text-white flex items-center justify-center gap-2"><Database size={16}/> Restore Data</button>
                            <button onClick={handleUnlinkGoogleDrive} className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white flex items-center justify-center gap-2"><Link size={16}/> Unlink</button>
                        </div>
                    ) : (
                        <button onClick={handleLinkGoogleDrive} className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white flex items-center justify-center gap-2"><Link size={20}/> Link to Google Drive</button>
                    )}
                </div>

                <button onClick={handleLogout} className="w-full text-left p-4 flex items-center gap-4 bg-gray-50 dark:bg-brand-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <LogOut size={20} className="text-red-500" />
                    <span>Logout</span>
                </button>
            </div>
        );
      default: return <div>Unknown View</div>;
    }
  };

  const MainNav = () => {
    const navItems = [
      { view: View.DASHBOARD, label: "Home", icon: Home },
      { view: View.PARTIES, label: "Parties", icon: UserPlus },
      { view: View.PURCHASE, label: "Purchase", icon: ShoppingBag },
      { view: View.INVENTORY, label: "Inventory", icon: Package },
    ];
    
    const handleNavClick = (view: View) => {
        if(view === View.PURCHASE) {
            clearFormStates(View.PURCHASE);
        }
        switchView(view);
    }
    
    return (
      <nav className="fixed bottom-4 left-4 right-4 bg-white dark:bg-brand shadow-lg dark:shadow-black/50 md:max-w-sm mx-auto rounded-full no-print z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ view, label, icon: Icon }) => (
            <button key={view} onClick={() => handleNavClick(view)} className={`flex flex-col items-center justify-center w-full transition-colors ${currentView === view ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Icon size={24} />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  };
  
  return (
    <div className={`theme-${theme} ${theme} font-inter min-h-screen ${theme === 'light' ? 'bg-gray-50 text-gray-900' : 'bg-brand-dark text-gray-200'}`}>
        <div className={`${viewMode === 'mobile' ? 'max-w-2xl' : 'max-w-7xl'} mx-auto`}>
            <main className="p-4 pb-24">
                <PageHeader />
                {renderView()}
            </main>
        </div>

        {showSyncPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-brand p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <Database size={48} className="mx-auto text-blue-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Sync Your Data</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Link your Google Drive to automatically save, sync, and restore your data across all your devices. Never lose your data again!</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleLinkGoogleDrive} className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold">Link to Google Drive</button>
                        <button onClick={() => setShowSyncPopup(false)} className="w-full py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold">Later</button>
                    </div>
                </div>
            </div>
        )}

        {showPinModal && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-brand p-6 rounded-2xl shadow-xl w-full max-w-sm">
                    <h2 className="text-2xl font-bold mb-4">{isPinSet ? 'Change PIN' : 'Create PIN'}</h2>
                    <div className="space-y-4">
                        <input type="password" placeholder="New 4-Digit PIN" value={newPin} onChange={e => /^\d{0,4}$/.test(e.target.value) && setNewPin(e.target.value)} maxLength={4} className={inputClasses} />
                        <input type="password" placeholder="Confirm 4-Digit PIN" value={confirmNewPin} onChange={e => /^\d{0,4}$/.test(e.target.value) && setConfirmNewPin(e.target.value)} maxLength={4} className={inputClasses} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => {setShowPinModal(false); setNewPin(''); setConfirmNewPin('');}} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                        <button onClick={handleSetPin} className="py-2 px-6 rounded-lg bg-blue-600 text-white">Save</button>
                    </div>
                </div>
            </div>
        )}

        {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-brand p-4 rounded-lg shadow-xl w-full max-w-sm m-4 space-y-4">
                    <h2 className="text-xl font-bold">{editingPaymentOutId ? 'Edit Payment Out' : 'New Payment Out'}</h2>
                    <div><input type="date" value={paymentOutDate} onChange={e => setPaymentOutDate(e.target.value)} className={inputClasses}/><p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">BS: {formatDate(paymentOutDate)}</p></div>
                    <select value={paymentOutRecipient} onChange={e => setPaymentOutRecipient(e.target.value)} className={inputClasses}><option value="">Select Recipient*</option>{parties.filter(p=>p.type !== 'customer').map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select>
                    <input type="number" placeholder="Amount*" value={paymentOutAmount} onChange={e => setPaymentOutAmount(e.target.value)} className={inputClasses}/>
                    <div className="flex items-center gap-4"><label><input type="radio" name="pmOut" value="cash" checked={paymentOutMethod === 'cash'} onChange={() => setPaymentOutMethod('cash')} /> Cash</label><label><input type="radio" name="pmOut" value="check" checked={paymentOutMethod === 'check'} onChange={() => setPaymentOutMethod('check')} /> CHQ</label>{paymentOutMethod === 'check' && <input type="text" placeholder="CHQ No." value={paymentOutCheckNo} onChange={(e) => setPaymentOutCheckNo(e.target.value)} className={`${inputClasses} p-2 flex-1`} />}</div>
                    <textarea placeholder="Notes" value={paymentOutNotes} onChange={e => setPaymentOutNotes(e.target.value)} className={`${inputClasses} h-24`} rows={2}/>
                    <div className="flex justify-end gap-3"><button onClick={() => {setShowPaymentModal(false); clearFormStates('paymentOut');}} className="py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button><button onClick={handleAddPaymentOut} className="py-2 px-6 rounded-lg bg-blue-600 text-white">{editingPaymentOutId ? 'Update' : 'Save'}</button></div>
                </div>
            </div>
        )}
        
        {showDownloadModal && downloadContext && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
                <div className="bg-white dark:bg-brand p-6 rounded-lg shadow-xl w-full max-w-sm m-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4">Download "{downloadContext.title}"</h2>
                    <button onClick={() => { window.print(); setShowDownloadModal(false); }} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-red-500 text-white font-semibold"><Printer size={20}/> PDF</button>
                    <button onClick={handleExportCsv} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-green-500 text-white font-semibold"><FileSpreadsheet size={20}/> CSV</button>
                    <button onClick={handleShare} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-blue-500 text-white font-semibold"><Share2 size={20}/> Share</button>
                    <button onClick={() => setShowDownloadModal(false)} className="w-full mt-4 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold">Cancel</button>
                </div>
            </div>
        )}

        {showDeleteConfirm && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-brand p-6 rounded-lg shadow-xl w-full max-w-sm m-4">
                    <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
                    <p className="mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={cancelDelete} className="py-2 px-6 rounded-lg bg-gray-200 dark:bg-gray-700">Cancel</button>
                        <button onClick={confirmDelete} className="py-2 px-6 rounded-lg bg-red-600 text-white">Delete</button>
                    </div>
                </div>
            </div>
        )}
        
        {showPinDeleteConfirm && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-brand p-6 rounded-lg shadow-xl w-full max-w-sm m-4">
                    <h2 className="text-xl font-bold mb-4">Delete PIN Confirmation</h2>
                    <p className="mb-6">Are you sure you want to delete your PIN? This will disable the app lock requirement.</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={cancelPinDelete} className="py-2 px-6 rounded-lg bg-gray-200 dark:bg-gray-700">No</button>
                        <button onClick={confirmPinDelete} className="py-2 px-6 rounded-lg bg-red-600 text-white">Yes, Delete</button>
                    </div>
                </div>
            </div>
        )}

        {showPostTransactionPopup && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
                <div className="bg-white dark:bg-brand p-4 rounded-t-2xl shadow-xl w-full max-w-2xl">
                    <div className="text-center mb-4">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
                        <h2 className="text-2xl font-bold">{showPostTransactionPopup.type === 'sale' ? 'Sale' : 'Purchase'} Saved!</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                        <button 
                            onClick={() => {
                                handleEditRecord({originalRecordId: showPostTransactionPopup.id, transactionType: showPostTransactionPopup.type});
                                setShowPostTransactionPopup(null);
                            }}
                            className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white font-semibold">
                            View Invoice
                        </button>
                        <button 
                            onClick={() => {
                                setShowPostTransactionPopup(null);
                                clearFormStates(showPostTransactionPopup.type === 'sale' ? View.SALES : View.PURCHASE);
                                switchView(showPostTransactionPopup.type === 'sale' ? View.SALES : View.PURCHASE);
                            }}
                            className="w-full py-3 px-4 rounded-lg bg-green-500 text-white font-semibold">
                            New {showPostTransactionPopup.type === 'sale' ? 'Sale' : 'Purchase'}
                        </button>
                        <button 
                            onClick={() => { setShowPostTransactionPopup(null); switchView(View.DASHBOARD); }}
                            className="w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 font-semibold sm:col-span-1 col-span-1">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
        {currentView === View.DASHBOARD && <MainNav />}
    </div>
  );
}