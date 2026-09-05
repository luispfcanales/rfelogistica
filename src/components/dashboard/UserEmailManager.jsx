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
      if (data.error) {
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
      const res = await updateUserEmail(editingUser.id, newEmail.trim());
      if (res.error) {
        throw new Error(res.error);
      }

      showToast(`Correo de ${editingUser.name} actualizado a ${newEmail.trim()}`, 'success');

      handleCloseModal();
      loadUsers();
    } catch (err) {
      showToast(`Error al actualizar correo: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
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
      <div className="bg-[#161B22] border border-[#2D333B] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
              <span className="p-2 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
              Gestión de Correos de Usuarios
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Consulta la lista de usuarios en Odoo y modifica sus correos electrónicos de inicio de sesión (`login`)
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recargar Lista
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0A0E17]/60 border border-[#2D333B] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-100 mt-1">{users.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              #
            </div>
          </div>

          <div className="bg-[#0A0E17]/60 border border-[#2D333B] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Usuarios Activos</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-[#0A0E17]/60 border border-[#2D333B] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Inactivos</p>
              <p className="text-2xl font-bold text-gray-400 mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-500/10 text-gray-400 flex items-center justify-center font-bold">
              !
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full">
          <svg className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o correo de usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0E17] border border-[#2D333B] focus:border-violet-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition-all"
          />
        </div>

        <div className="text-xs text-gray-400 font-medium whitespace-nowrap">
          Mostrando <span className="text-gray-100 font-bold">{filteredUsers.length}</span> de {users.length} usuarios
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-violet-600/30 border-t-violet-500 rounded-full"></div>
            <p className="text-sm text-gray-400">Cargando usuarios desde Odoo...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="font-semibold">No se encontraron usuarios</p>
            <p className="text-xs text-gray-500 mt-1">Prueba ingresando otro término de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0A0E17]/80 text-gray-400 text-xs font-bold uppercase border-b border-[#2D333B]">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Correo / Login en Odoo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D333B]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1F242D]/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">#{user.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-gray-100">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                      <span className="bg-[#0A0E17] border border-[#2D333B] px-3 py-1.5 rounded-lg text-violet-300 inline-block">
                        {user.login || user.email || '(sin correo)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 border border-gray-500/20 text-xs px-2.5 py-1 rounded-full font-medium">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-violet-600/20 active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 210.3H3v-3.572L16.732 3.732z" />
                        </svg>
                        Cambiar Correo
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
      <Modal
        isOpen={!!editingUser}
        onClose={handleCloseModal}
        title="Modificar Correo de Usuario"
      >
        {editingUser && (
          <form onSubmit={handleSaveEmail} className="space-y-5">
            <div className="bg-[#0A0E17] border border-[#2D333B] rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {editingUser.name ? editingUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-100">{editingUser.name}</h4>
                <p className="text-xs text-gray-400">ID de Odoo: #{editingUser.id}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Correo Actual
              </label>
              <input
                type="text"
                disabled
                value={editingUser.login || editingUser.email || '(sin correo)'}
                className="w-full bg-[#0A0E17]/50 border border-[#2D333B] text-gray-500 rounded-xl px-4 py-2.5 text-sm font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-violet-400 mb-2">
                Nuevo Correo Electrónico (Login de Odoo) *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full bg-[#0A0E17] border border-violet-500/50 focus:border-violet-400 focus:ring-1 focus:ring-violet-400 focus:outline-none text-gray-100 rounded-xl px-4 py-2.5 text-sm font-mono transition-all"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Al guardar, se actualizará el campo de inicio de sesión (`login`) y correo de contacto en Odoo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2D333B]">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="bg-[#21262D] hover:bg-[#30363D] text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
