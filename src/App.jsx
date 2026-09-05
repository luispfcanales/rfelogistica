import { useState, useEffect } from 'react';
import { fetchPaymentTerms, fetchOrder, fetchOrderLines, createInvoice } from './api/odoo';
import { useToast } from './hooks/useToast';

import Header from './components/dashboard/Header';
import SearchPanel from './components/dashboard/SearchPanel';
import OrderSummary from './components/dashboard/OrderSummary';
import OrderLines from './components/dashboard/OrderLines';
import InvoiceForm from './components/dashboard/InvoiceForm';
import TSBReports from './components/dashboard/TSBReports';
import Toast from './components/ui/Toast';
import Login from './components/auth/Login';
import Modal from './components/ui/Modal';
import MainMenuView from './components/dashboard/MainMenuView';
import TSBStock from './components/dashboard/TSBStock';
import UserEmailManager from './components/dashboard/UserEmailManager';


export default function App() {
  const { toast, showToast } = useToast();

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('odoo_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });


  const [view, setView] = useState('home'); // 'home', 'billing', 'reports', or 'stock'
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(null);
  const [lines, setLines] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ... (rest of the state and handlers remain the same)

  useEffect(() => {
    if (user) {
      fetchPaymentTerms()
        .then(data => {
          if (data.error) {
            showToast(`Error al cargar términos de pago: ${data.error}`, 'error');
          } else {
            setPaymentTerms(data);
          }
        })
        .catch(err => {
          console.error(err);
          showToast('Error de conexión al cargar términos de pago', 'error');
        });
    }
  }, [user]);

  const handleLogin = (userData) => {
    localStorage.setItem('odoo_user', JSON.stringify(userData));
    setUser(userData);
  };


  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('odoo_user');
    setOrder(null);
    setLines([]);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setOrder(null);
    setLines([]);
    setSerial('');
    setCorrelative('');
    setInvoiceDate('');
    setPaymentTermId('');

    try {
      const orderData = await fetchOrder(query);
      if (orderData.error) throw new Error(orderData.error);
      setOrder(orderData);

      const linesData = await fetchOrderLines(orderData.id);
      if (linesData.error) throw new Error(linesData.error);

      setLines(linesData.map(l => ({ ...l, selected: true, invoiceQty: l.pending })));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (id) => {
    setLines(lines.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  };

  const toggleAll = (e) => {
    const checked = e.target.checked;
    setLines(lines.map(l => ({ ...l, selected: checked })));
  };

  const updateQty = (id, val) => {
    const num = parseFloat(val) || 0;
    setLines(lines.map(l => {
      if (l.id === id) {
        return { ...l, invoiceQty: Math.min(Math.max(num, 0), l.pending) };
      }
      return l;
    }));
  };

  const selectedLines = lines.filter(l => l.selected && l.invoiceQty > 0);
  const total = selectedLines.reduce((sum, l) => sum + (l.invoiceQty * l.price_unit), 0);

  const handleCreateInvoice = async () => {
    if (selectedLines.length === 0) return showToast('Selecciona al menos una línea a facturar', 'error');
    if (!serial || !correlative || !invoiceDate || !paymentTermId) {
      return showToast('Completa los campos obligatorios del formulario de factura', 'error');
    }

    setLoading(true);
    try {
      const payload = {
        order_id: order.id,
        serial,
        correlative,
        record_type: recordType,
        invoice_date: invoiceDate,
        payment_term_id: parseInt(paymentTermId),
        lines: selectedLines.map(l => ({ line_id: l.id, quantity: l.invoiceQty }))
      };

      const data = await createInvoice(payload);

      if (data.error) throw new Error(data.error);

      showToast(`Factura creada exitosamente (ID: ${data.invoice_id})`, 'success');

      // Reload lines
      setTimeout(() => handleSearch(), 1500);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} showToast={showToast} />
        <Toast toast={toast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E17] text-gray-300 font-sans p-6">
      <div className="max-w-6xl mx-auto">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          selectedCount={selectedLines.length}
          selectedTotal={total}
          onOpenInvoice={() => setIsModalOpen(true)}
          currentView={view}
          setView={setView}
        />

        {view === 'home' ? (
          <MainMenuView onSelectView={setView} />
        ) : view === 'reports' ? (
          <TSBReports showToast={showToast} />
        ) : view === 'stock' ? (
          <TSBStock showToast={showToast} />
        ) : view === 'users' ? (
          <UserEmailManager showToast={showToast} />
        ) : (
          <>
            <SearchPanel
              query={query}
              setQuery={setQuery}
              handleSearch={handleSearch}
              loading={loading}
            />

            {loading && !order && (
              <div className="flex justify-center p-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full"></div>
              </div>
            )}

            {order && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <OrderSummary order={order} lines={lines} />

                <OrderLines
                  lines={lines}
                  toggleAll={toggleAll}
                  toggleLine={toggleLine}
                  updateQty={updateQty}
                />

                <Modal 
                  isOpen={isModalOpen} 
                  onClose={() => setIsModalOpen(false)}
                  title="Detalles de la Factura"
                >
                  <InvoiceForm
                    serial={serial} setSerial={setSerial}
                    correlative={correlative} setCorrelative={setCorrelative}
                    recordType={recordType} setRecordType={setRecordType}
                    invoiceDate={invoiceDate} setInvoiceDate={setInvoiceDate}
                    paymentTermId={paymentTermId} setPaymentTermId={setPaymentTermId}
                    paymentTerms={paymentTerms}
                    selectedLines={selectedLines}
                    total={total}
                    loading={loading}
                    handleCreateInvoice={handleCreateInvoice}
                  />
                </Modal>
              </div>
            )}
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

