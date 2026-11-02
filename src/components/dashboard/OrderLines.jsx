export default function OrderLines({ lines, toggleAll, toggleLine, updateQty }) {
    if (!lines || lines.length === 0) return null;

    const allSelected = lines.length > 0 && lines.every(l => l.selected);
    const selectedCount = lines.filter(l => l.selected).length;
    const selectedTotal = lines.filter(l => l.selected).reduce((sum, l) => sum + (l.invoiceQty * l.price_unit), 0);

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <button onClick={() => toggleAll({ target: { checked: true } })} className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors bg-white border border-slate-300 px-4 py-2 rounded-xl shadow-sm">Seleccionar todo</button>
                    <button onClick={() => toggleAll({ target: { checked: false } })} className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors bg-white border border-slate-300 px-4 py-2 rounded-xl shadow-sm">Deseleccionar todo</button>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl border border-blue-200">{selectedCount} seleccionados</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">S/ {selectedTotal.toFixed(2)}</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-bold bg-slate-50">
                                <th className="px-4 py-4 text-center w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="px-4 py-4 w-12 text-center">#</th>
                                <th className="px-4 py-4">Producto</th>
                                <th className="px-4 py-4 text-center">Cant. OC</th>
                                <th className="px-4 py-4 text-center">Facturado</th>
                                <th className="px-4 py-4 text-center">Pendiente</th>
                                <th className="px-4 py-4 text-right">Precio Unit.</th>
                                <th className="px-4 py-4 text-center w-32">A facturar</th>
                                <th className="px-4 py-4 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lines.map((line, index) => (
                                <tr key={line.id} className={`transition-colors ${line.selected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={line.selected}
                                            onChange={() => toggleLine(line.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm font-mono text-slate-400">{index + 1}</td>
                                    <td className="px-4 py-4">
                                        <div className="font-bold text-sm text-slate-900">[{line.product_id ? line.product_id[0] : ''}] {line.product_name || line.name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{line.uom_name || 'Units'}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{line.product_qty.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center font-mono text-sm text-slate-400">{(line.product_qty - line.pending).toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            {line.pending.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm text-slate-700">S/ {line.price_unit.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max={line.pending}
                                            step="1"
                                            disabled={!line.selected}
                                            value={line.invoiceQty}
                                            onChange={(e) => updateQty(line.id, e.target.value)}
                                            className="w-20 text-center bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-600 disabled:opacity-40 text-blue-700 font-bold font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-sm text-slate-900 font-mono">
                                        S/ {(line.invoiceQty * line.price_unit).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
