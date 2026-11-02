import { useState, useEffect } from 'react';
import { fetchUsers, updateUserEmail } from '../../api/odoo';
import Modal from '../ui/Modal';

export default function UserEmailManager({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      if (data && data.error) {
        showToast(`Error al cargar usuarios: ${data.error}`, 'error');
      } else {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al obtener usuarios de Odoo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setNewEmail(user.login || user.email || '');
  };

  const handleCloseModal = () => {
    if (!saving) {
      setEditingUser(null);
      setNewEmail('');
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      showToast('Ingresa una dirección de correo válida', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      showToast('El formato del correo electrónico no es válido', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserEmail(editingUser.id, newEmail.trim());
      if (result.error) {
        showToast(`Error: ${result.error}`, 'error');
      } else {
        showToast(`Correo de inicio de sesión de ${editingUser.name} actualizado a ${newEmail.trim()}`, 'success');
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, login: newEmail.trim(), email: newEmail.trim() } : u));
        handleCloseModal();
      }
    } catch (err) {
      showToast(err.message || 'Error al actualizar el correo del usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = user.name?.toLowerCase().includes(query);
    const loginMatch = user.login?.toLowerCase().includes(query);
    const emailMatch = user.email?.toLowerCase().includes(query);
    return nameMatch || loginMatch || emailMatch;
  });

  const activeCount = users.filter(u => u.active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="p-2 bg-violet-50 text-violet-600 border border-violet-200 rounded-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
              Gestión de Correos de Usuarios
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Consulta la lista de usuarios en Odoo y modifica sus correos electrónicos de inicio de sesión (`login`)
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recargar Lista
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Usuarios</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{users.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              #
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Usuarios Activos</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Inactivos</p>
              <p className="text-2xl font-black text-slate-500 mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
              !
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full">
          <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o correo de usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-violet-600 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all font-sans"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Mostrando <span className="text-slate-900 font-bold">{filteredUsers.length}</span> de {users.length} usuarios
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-violet-600/30 border-t-violet-600 rounded-full"></div>
            <p className="text-sm text-slate-500 font-medium">Cargando usuarios desde Odoo...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="font-bold text-slate-700">No se encontraron usuarios</p>
            <p className="text-xs text-slate-400 mt-1">Prueba ingresando otro término de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Correo / Login en Odoo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">#{user.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                      <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-violet-700 font-medium inline-block">
                        {user.login || user.email || '(sin correo)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 text-xs px-2.5 py-1 rounded-full font-medium">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Editar Correo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Email Modal */}
      {editingUser && (
        <Modal isOpen={!!editingUser} onClose={handleCloseModal} title="Editar Correo de Usuario">
          <form onSubmit={handleSaveEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Usuario en Odoo
              </label>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold text-sm">
                {editingUser.name} <span className="text-xs text-slate-500 font-mono">(ID: #{editingUser.id})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Nuevo Correo de Inicio de Sesión (Login)
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-violet-600 focus:outline-none transition-all font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Este correo sustituirá el nombre de usuario de inicio de sesión (`login`) en Odoo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Guardar Cambios
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
