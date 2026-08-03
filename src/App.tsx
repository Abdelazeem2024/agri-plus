import { useState, Component, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import Representatives from './pages/Representatives';
import Reports from './pages/Reports';
import Profits from './pages/Profits';
import Settings from './pages/Settings';
import CustomerReturns from './pages/CustomerReturns';
import CustomerStatement from './pages/CustomerStatement';
import EditInvoice from './pages/EditInvoice';
import RepPayments from './pages/RepPayments';
import StockReceipts from './pages/StockReceipts';
import Collections from './pages/Collections';
import RepresentativeReturns from './pages/RepresentativeReturns';
import RepresentativeStatement from './pages/RepresentativeStatement';

declare global {
  interface Window {
    electronAPI?: {
      getMachineId: () => Promise<string>;
      getAppPath: () => Promise<string>;
      getUserDataPath: () => Promise<string>;
      saveFileDialog: (options: any) => Promise<any>;
      openFileDialog: (options: any) => Promise<any>;
      writeFile: (path: string, data: string) => Promise<any>;
      readFile: (path: string) => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      dbLoad: () => Promise<{ success: boolean; data?: any; error?: string }>;
      dbSave: (data: any) => Promise<{ success: boolean; error?: string }>;
      dbExportJson: () => Promise<{ success: boolean; data?: string; error?: string }>;
      dbImportJson: (json: string) => Promise<{ success: boolean; message?: string; summary?: any }>;
      dbPath: () => Promise<string | null>;
      licenseValidate: (code: string, machineId?: string) => Promise<{ valid: boolean; type?: string; expiresAt?: string; message: string }>;
      licenseGenerate: (machineId: string, type?: string, years?: number) => Promise<{ success: boolean; key?: string; error?: string }>;
    };
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || 'خطأ غير معروف' };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background text-slate-900 dark:text-slate-100" style={{ direction: 'rtl', fontFamily: 'Tahoma' }}>
          <div className="bg-surface rounded-2xl p-8 shadow-xl max-w-md space-y-4 border border-slate-200 dark:border-slate-600">
            <h2 className="text-xl font-bold">حدث خطأ في الواجهة</h2>
            <p className="text-red-500 dark:text-red-400 text-sm">{this.state.error}</p>
            <button className="bg-secondary text-white px-5 py-2.5 rounded-xl" onClick={() => location.reload()}>إعادة فتح البرنامج</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LicenseGate({ children }: { children: React.ReactNode }) {
  const { licenseValid, trialDaysLeft, storageReady } = useApp();
  if (!storageReady) {
    return (
      <div className="fixed inset-0 bg-primary dark:bg-slate-950 flex items-center justify-center z-50">
        <p className="text-white text-lg">جاري تحميل البيانات...</p>
      </div>
    );
  }
  if (!licenseValid && trialDaysLeft <= 0) {
    return (
      <div className="fixed inset-0 bg-primary flex items-center justify-center p-6 z-50">
        <div className="bg-surface rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-600">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">انتهت الفترة التجريبية / الترخيص</h2>
          <p className="text-slate-600 dark:text-slate-300">انتهت صلاحية الاستخدام. أرسل Machine ID للبائع واطلب كود التفعيل.</p>
          <a
            href="#/settings"
            className="inline-block bg-secondary text-white px-6 py-3 rounded-xl font-medium"
          >
            الذهاب لشاشة التفعيل
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <LicenseGate>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/representatives" element={<Representatives />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profits" element={<Profits />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/customer-returns" element={<CustomerReturns />} />
          <Route path="/invoices/:id/edit" element={<EditInvoice />} />
          <Route path="/rep-payments" element={<RepPayments />} />
          <Route path="/stock-receipts" element={<StockReceipts />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/customers/:id/statement" element={<CustomerStatement />} />
          <Route path="/representative-returns" element={<RepresentativeReturns />} />
          <Route path="/representatives/:id/statement" element={<RepresentativeStatement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LicenseGate>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <AppProvider>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        {!showSplash && <AppRoutes />}
      </AppProvider>
    </ErrorBoundary>
  );
}
