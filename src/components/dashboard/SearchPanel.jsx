export default function SearchPanel({ query, setQuery, handleSearch, loading }) {
    return (
        <div className="bg-[#161B22] p-6 rounded-xl border border-[#2D333B] shadow-sm transition-all mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Referencia de Orden de Compra
            </label>
            <form onSubmit={handleSearch} className="flex gap-3">
                <input
                    type="text"
                    className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
                    placeholder="Ej: 1324 o OC-01324"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    disabled={loading}
                    type="submit"
                    className="bg-blue-600/90 hover:bg-blue-600 active:scale-95 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                    Cargar OC
                </button>
            </form>
        </div>
    );
}
