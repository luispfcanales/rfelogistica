export default function InvoiceForm({
    serial, setSerial,
    correlative, setCorrelative,
    recordType, setRecordType,
    invoiceDate, setInvoiceDate,
    paymentTermId, setPaymentTermId,
    paymentTerms,
    selectedLines,
    total,
    loading,
    handleCreateInvoice
}) {
    if (selectedLines.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Detalles de la Factura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Número de Serie</label>
                    <input
                        type="text"
                        placeholder="Ej: F001"
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                        value={serial}
                        onChange={e => setSerial(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Número Correlativo</label>
                    <input
                        type="text"
                        placeholder="Ej: 0001234"
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                        value={correlative}
                        onChange={e => setCorrelative(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tipo de Registro</label>
                    <select
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                        value={recordType}
                        onChange={e => setRecordType(e.target.value)}
                    >
                        <option value="goods">Bienes</option>
                        <option value="services">Servicios</option>
                        <option value="delivery_to_render">Entregas a rendir</option>
                        <option value="fixed_funds_air_tickets">Fondos fijos - Pasajes</option>
                        <option value="fixed_funds_petty_cash">Fondos fijos - Caja Chica</option>
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fecha de Factura</label>
                    <input
                        type="date"
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono"
                        value={invoiceDate}
                        onChange={e => setInvoiceDate(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-2 lg:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Términos de Pago</label>
                    <select
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                        value={paymentTermId}
                        onChange={e => setPaymentTermId(e.target.value)}
                    >
                        <option value="" disabled>Seleccione un término...</option>
                        {paymentTerms.map(pt => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <p className="text-sm text-slate-600">Se creará una factura con <strong className="text-slate-900">{selectedLines.length}</strong> líneas seleccionadas.</p>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto overflow-hidden">
                    <div className="text-right flex-1 md:flex-none">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">Total estimado</span>
                        <span className="text-2xl font-bold font-mono text-emerald-600">S/ {total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleCreateInvoice}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 min-w-[200px]"
                    >
                        {loading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                        Crear Factura
                    </button>
                </div>
            </div>
        </div>
    );
}
