export default function SearchPanel({ query, setQuery, handleSearch, loading }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Referencia de Orden de Compra
            </label>
            <form onSubmit={handleSearch} className="flex gap-3">
                <input
                    type="text"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                    placeholder="Ej: 1324 o OC-01324"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    disabled={loading}
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                    Cargar OC
                </button>
            </form>
        </div>
    );
}
