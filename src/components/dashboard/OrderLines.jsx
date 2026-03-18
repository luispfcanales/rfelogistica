export default function OrderLines({ lines, toggleAll, toggleLine, updateQty }) {
    if (lines.length === 0) return null;

    const allSelected = lines.length > 0 && lines.every(l => l.selected);
    const selectedCount = lines.filter(l => l.selected).length;
    const selectedTotal = lines.filter(l => l.selected).reduce((sum, l) => sum + (l.invoiceQty * l.price_unit), 0);

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <button onClick={() => toggleAll({ target: { checked: true } })} className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors bg-[#161B22] border border-[#2D333B] px-4 py-2 rounded-lg">Seleccionar todo</button>
                    <button onClick={() => toggleAll({ target: { checked: false } })} className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors bg-[#161B22] border border-[#2D333B] px-4 py-2 rounded-lg">Deseleccionar todo</button>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">{selectedCount} seleccionados</span>
                    <span className="text-sm font-mono text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 px-3 py-1.5 rounded-lg">S/ {selectedTotal.toFixed(2)}</span>
                </div>
            </div>

            <div className="bg-[#161B22] rounded-xl border border-[#2D333B] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2D333B] text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="px-4 py-4 text-center w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-[#30363D] bg-[#0D1117] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#161B22]"
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
                        <tbody className="divide-y divide-[#2D333B]/50">
                            {lines.map((line, index) => (
                                <tr key={line.id} className={`transition-colors ${line.selected ? 'bg-blue-900/10' : 'hover:bg-[#1C2128]'}`}>
                                    <td className="px-4 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-[#30363D] bg-[#0D1117] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#161B22] cursor-pointer"
                                            checked={line.selected}
                                            onChange={() => toggleLine(line.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm font-mono text-gray-500">{index + 1}</td>
                                    <td className="px-4 py-4">
                                        <div className="font-semibold text-sm text-gray-200">[{line.product_id ? line.product_id[0] : ''}] {line.product_name || line.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{line.uom_name || 'Units'}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-mono text-sm text-gray-300">{line.product_qty.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center font-mono text-sm text-gray-500">{(line.product_qty - line.pending).toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-900/30 text-amber-500 border border-amber-700/30">
                                            {line.pending.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm text-gray-300">S/ {line.price_unit.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max={line.pending}
                                            step="1"
                                            disabled={!line.selected}
                                            value={line.invoiceQty}
                                            onChange={(e) => updateQty(line.id, e.target.value)}
                                            className="w-20 text-center bg-[#0D1117] border border-[#30363D] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-30 text-gray-200 font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium text-sm text-gray-200 font-mono">
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
