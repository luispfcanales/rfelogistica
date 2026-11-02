export default function OrderSummary({ order, lines }) {
    if (!order) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-12 mb-6">
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Referencia</span>
                <span className="text-blue-600 font-bold font-mono text-base">{order.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Proveedor</span>
                <span className="font-bold text-slate-800">{order.partner_id ? order.partner_id[1].toUpperCase() : '—'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Estado</span>
                <span className="font-semibold text-slate-700 capitalize">{order.state}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total OC</span>
                <span className="font-bold text-slate-900 font-mono">S/ {(order.amount_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Líneas Pendientes</span>
                <span className="font-bold text-blue-600 font-mono">{lines ? lines.length : 0} líneas</span>
            </div>
        </div>
    );
}
