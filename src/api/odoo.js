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

