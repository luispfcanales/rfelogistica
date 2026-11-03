const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';



const getAuthHeaders = () => {
    const savedUser = localStorage.getItem('odoo_user');
    if (!savedUser) return {};
    const user = JSON.parse(savedUser);
    return {
        'X-Odoo-User': user.username,
        'X-Odoo-Key': user.password
    };
};

export const fetchPaymentTerms = async () => {
    const res = await fetch(`${API_BASE}/payment-terms`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const fetchOrder = async (query) => {
    const res = await fetch(`${API_BASE}/order?query=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const fetchOrderLines = async (orderId) => {
    const res = await fetch(`${API_BASE}/lines?order_id=${orderId}`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const createInvoice = async (payload) => {
    const res = await fetch(`${API_BASE}/create-invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
    });
    return res.json();
};

export const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    return res.json();
};
export const fetchTSBReports = async (month = '', location = '') => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (location && location !== 'ALL') params.append('location', location);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/tsb/reports${queryString}`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const fetchTSBKardex = async ({ month = '', location = 'ALL', product = '', method = 'GLOBAL_AVCO', sort = 'asc' } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (location && location !== 'ALL') params.append('location', location);
    if (product) params.append('product', product);
    if (method) params.append('method', method);
    if (sort) params.append('sort', sort);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/tsb/kardex${queryString}`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const fetchTSBReconciliation = async () => {
    const res = await fetch(`${API_BASE}/tsb/stock/reconcile`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const downloadTSBKardexExcel = async ({ month = '', location = 'ALL', product = '', method = 'GLOBAL_AVCO', sort = 'asc' } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (location && location !== 'ALL') params.append('location', location);
    if (product) params.append('product', product);
    if (method) params.append('method', method);
    if (sort) params.append('sort', sort);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/tsb/reports/export${queryString}`, {
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        let errMsg = 'Error al generar el reporte de Kardex';
        try {
            const errJson = await res.json();
            if (errJson && errJson.error) errMsg = errJson.error;
        } catch (_) {}
        throw new Error(errMsg);
    }

    let downloadName = '';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
            downloadName = match[1];
        }
    }
    if (!downloadName) {
        const prodSuffix = product ? product.replace(/\s+/g, '_') : 'TODOS';
        const locSuffix = location && location !== 'ALL' ? location.replace(/[\s\/]+/g, '_') : 'CONSOLIDADO';
        const periodSuffix = month || 'HISTORICO';
        downloadName = `Kardex_${prodSuffix}_${locSuffix}_${periodSuffix}.xlsx`;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};



export const fetchTSBStock = async () => {
    const res = await fetch(`${API_BASE}/tsb/stock`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/users`, {
        headers: getAuthHeaders()
    });
    return res.json();
};

export const updateUserEmail = async (userId, email) => {
    const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ user_id: userId, email })
    });
    return res.json();
};

export const createDelivery = async (payload) => {
    const res = await fetch(`${API_BASE}/create-delivery`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
    });
    return res.json();
};


