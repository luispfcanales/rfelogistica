export default function Header({ user, onLogout, selectedCount, selectedTotal, onOpenInvoice, currentView, setView }) {
    return (
        <header className="sticky top-0 z-50 flex items-center gap-4 py-4 mb-6 border-b border-[#2D333B]/50 bg-[#0A0E17]/80 backdrop-blur-md px-2 -mx-2 transition-all duration-300">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
                OD
            </div>
            <div className="flex-1 flex justify-between items-center whitespace-nowrap">
                <div className="flex items-center gap-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <h1 className="text-xl font-bold tracking-tight text-gray-100">
                            {currentView === 'billing' ? 'Facturación Parcial' : 
                             currentView === 'reports' ? 'Reportes TSB' : 
                             currentView === 'stock' ? 'Stock Tambopata' : 
                             currentView === 'users' ? 'Gestión de Usuarios' : 'Odoo RP'}
                        </h1>
                    </div>
                    
                    <button 
                        onClick={() => setView('home')}
                        className="flex items-center gap-2 bg-[#161B22] border border-[#2D333B] hover:border-blue-500/50 px-3 py-1.5 rounded-xl transition-all group lg:ml-4"
                        title="Ir al menú principal"
                    >
                        <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs font-bold text-gray-400 group-hover:text-gray-200 hidden sm:block">Menú</span>
                    </button>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                    {currentView === 'billing' && selectedCount > 0 && (
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



