export default function Header({ user, onLogout, selectedCount, selectedTotal, onOpenInvoice, currentView, setView }) {
    return (
        <header className="sticky top-0 z-50 flex items-center gap-4 py-3 mb-5 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 rounded-2xl shadow-sm transition-all duration-300 w-full">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
                OD
            </div>
            <div className="flex-1 flex justify-between items-center whitespace-nowrap">
                <div className="flex items-center gap-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                            {currentView === 'billing' ? 'Facturación Parcial' : 
                             currentView === 'reports' ? 'Reportes TSB' : 
                             currentView === 'stock' ? 'Stock Tambopata' : 
                             currentView === 'users' ? 'Gestión de Usuarios' : 'Odoo RP'}
                        </h1>
                    </div>
                    
                    <button 
                        onClick={() => setView('home')}
                        className="flex items-center gap-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all group lg:ml-4 shadow-sm"
                        title="Ir al menú principal"
                    >
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 hidden sm:block">Menú</span>
                    </button>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                    {currentView === 'billing' && selectedCount > 0 && (
                        <button
                            onClick={onOpenInvoice}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
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
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-tight">Sesión activa</p>
                                <p className="text-xs font-bold text-blue-700 leading-tight">{user.name}</p>
                            </div>
                            <button 
                                onClick={onLogout}
                                title="Cerrar sesión"
                                className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 uppercase tracking-wider shadow-sm"
                            >
                                <span className="hidden sm:inline">Salir</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
