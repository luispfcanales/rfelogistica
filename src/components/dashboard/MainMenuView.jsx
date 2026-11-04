export default function MainMenuView({ onSelectView }) {
  const apps = [
    {
      id: 'billing',
      title: 'Facturación Parcial',
      description: 'Gestión de facturas y órdenes de compra',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-blue-600 to-blue-400',
      shadow: 'shadow-blue-500/20'
    },
    {
      id: 'reports',
      title: 'Reportes TSB',
      description: 'Kardex Valorizado Interactivo (AVCO), trazabilidad y auditoría stock.quant',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-emerald-600 to-emerald-400',
      shadow: 'shadow-emerald-500/20'
    },
    {
      id: 'stock',
      title: 'Stock Tambopata',
      description: 'Consulta de niveles de inventario por ubicación',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'from-orange-600 to-orange-400',
      shadow: 'shadow-orange-500/20'
    },
    {
      id: 'users',
      title: 'Gestión de Usuarios',
      description: 'Modificar correos electrónicos de inicio de sesión de Odoo',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-violet-600 to-indigo-400',
      shadow: 'shadow-violet-500/20'
    },
    {
      id: 'analytic',
      title: 'Distribución Analítica Excel',
      description: 'Convertir nombres de Unidades de Negocio a ID Odoo {"937": 100.0}',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: 'from-indigo-600 to-violet-500',
      shadow: 'shadow-indigo-500/20'
    },
    {
      id: 'delivery',
      title: 'Crear Entregas desde OC',
      description: 'Generar borrador de movimiento (Inventario -> Operaciones -> Entregas) desde una Orden de Compra',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
        </svg>
      ),
      color: 'from-teal-600 to-cyan-400',
      shadow: 'shadow-teal-500/20'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-6 animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-6">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => onSelectView(app.id)}
            className="group relative bg-white border border-slate-200 rounded-3xl p-8 text-left transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
          >
            {/* Background Gradient Effect */}
            <div className={`absolute -right-12 -top-12 w-40 h-40 bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}></div>
            
            <div className="relative flex flex-col h-full">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white mb-6 ${app.shadow} group-hover:scale-110 transition-transform duration-300`}>
                {app.icon}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {app.title}
              </h3>
              
              <p className="text-slate-600 leading-relaxed text-sm">
                {app.description}
              </p>

              <div className="mt-8 flex items-center text-xs font-bold text-slate-400 tracking-widest uppercase group-hover:text-blue-600 transition-colors">
                Ingresar
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
