export default function OrderSummary({ order, lines }) {
    if (!order) return null;

    return (
        <div className="bg-[#161B22] p-6 rounded-xl border border-[#2D333B] shadow-sm flex flex-wrap gap-12 mb-6">
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Referencia</span>
                <span className="text-blue-400 font-semibold font-mono">{order.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Proveedor</span>
                <span className="font-semibold text-gray-200">{order.partner_id ? order.partner_id[1].toUpperCase() : '—'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Estado</span>
                <span className="font-medium text-gray-300 capitalize">{order.state}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Total OC</span>
                <span className="font-semibold text-gray-200 font-mono">S/ {(order.amount_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Líneas Pendientes</span>
                <span className="font-semibold text-blue-400 font-mono">{lines.length} líneas</span>
            </div>
        </div>
    );
}
