import { useState } from 'react';
import { login } from '../../api/odoo';

export default function Login({ onLogin, showToast }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) return showToast('Please enter both username and password', 'error');

        setLoading(true);
        try {
            const data = await login(username, password);
            if (data.error) throw new Error(data.error);
            onLogin(data);
            showToast(`Welcome back, ${data.name}!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/80 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-blue-600/25 mb-4 ring-4 ring-blue-600/15">
                        OD
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                        Odoo RP • Suite Externa
                    </span>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Herramientas Externas Odoo
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5 font-medium">
                        Inicia sesión con tus credenciales de Odoo para acceder a los módulos
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                            Usuario / Email
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder-slate-400"
                            placeholder="tu@email.com"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                            Contraseña / API Key
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder-slate-400"
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Autenticando...
                            </div>
                        ) : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-slate-200 pt-6 flex flex-col items-center gap-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Creado por <span className="text-blue-600">Luis Pfuño</span>
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <a 
                            href="https://github.com/luispfcanales" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            luispfcanales
                        </a>
                        <a 
                            href="https://luispf.org" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            luispf.org
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
