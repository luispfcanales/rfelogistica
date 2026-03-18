export default function Header({ user, onLogout, selectedCount, selectedTotal, onOpenInvoice }) {
    return (
        <header className="sticky top-0 z-50 flex items-center gap-4 py-4 mb-6 border-b border-[#2D333B]/50 bg-[#0A0E17]/80 backdrop-blur-md px-2 -mx-2 transition-all duration-300">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
                OD
            </div>
            <div className="flex-1 flex justify-between items-center whitespace-nowrap">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 overflow-hidden">
                    <h1 className="text-xl font-bold tracking-tight text-gray-100">
                        Facturación Parcial
                    </h1>
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300 overflow-hidden">
                            <span className="h-4 w-[1px] bg-gray-700 hidden sm:block"></span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate">
                                    {selectedCount} seleccionados
                                </span>
                                <span className="text-sm font-mono font-bold text-emerald-400">
                                    S/ {selectedTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                    {selectedCount > 0 && (
                        <button
                            onClick={onOpenInvoice}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-600/20 animate-in fade-in zoom-in duration-300 active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">Crear Factura</span>
                            <span className="sm:hidden text-lg">+</span>
                        </button>
                    )}

                    {user && (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden lg:block">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">Sesión activa</p>
                                <p className="text-xs font-semibold text-blue-400/80 leading-tight">{user.name}</p>
                            </div>
                            <button 
                                onClick={onLogout}
                                title="Cerrar sesión"
                                className="p-2 sm:px-3 sm:py-1.5 bg-[#161B22] hover:bg-red-900/20 hover:text-red-400 border border-[#2D333B] text-gray-400 text-xs font-bold rounded-lg transition-all active:scale-95 uppercase tracking-wider"
                            >
                                <span className="hidden sm:inline">Salir</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}



