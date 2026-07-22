export function getServerUrl() {
  const customUrl = localStorage.getItem('fsm_server_url');
  if (customUrl) return customUrl.replace(/\/$/, '');
  
  // Android Emulator default loopback address is 10.0.2.2
  if (typeof window !== 'undefined' && window.location.hostname === '10.0.2.2') {
    return 'http://10.0.2.2:3001';
  }
  return 'https://fsm-live.onrender.com';
}

export function setServerUrl(url) {
  if (!url) {
    localStorage.removeItem('fsm_server_url');
  } else {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    localStorage.setItem('fsm_server_url', clean);
  }
}

const isCapacitor = typeof window !== 'undefined' && (
  window.location.protocol.startsWith('capacitor') || 
  (window.location.hostname === 'localhost' && window.location.port === '')
);

export function getApiBase() {
  return isCapacitor ? `${getServerUrl()}/api` : '/api';
}

export function getUploadsUrl() {
  return isCapacitor ? `${getServerUrl()}/uploads` : '/uploads';
}

export const uploadsUrl = isCapacitor ? `${getServerUrl()}/uploads` : '/uploads';

async function req(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const baseUrl = getApiBase();
  const token = localStorage.getItem('fsm_auth_token');
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Bypass-Tunnel-Reminder': 'true',
      'bypass-tunnel-reminder': 'true',
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Customers
  getCustomers:   (p = {}) => req(`/customers?${new URLSearchParams(p)}`),
  getCustomer:    id       => req(`/customers/${id}`),
  createCustomer: data     => req('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, d)  => req(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteCustomer: id       => req(`/customers/${id}`, { method: 'DELETE' }),

  // Engineers
  getEngineers:   ()       => req('/engineers'),
  createEngineer: data     => req('/engineers', { method: 'POST', body: JSON.stringify(data) }),
  updateEngineer: (id, d)  => req(`/engineers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteEngineer: id       => req(`/engineers/${id}`, { method: 'DELETE' }),

  // Visits
  getVisits:        (p = {}) => req(`/visits?${new URLSearchParams(p)}`),
  getVisit:         id       => req(`/visits/${id}`),
  createVisit:      fd       => req('/visits', { method: 'POST', body: fd }),
  updateVisit:      (id, fd) => req(`/visits/${id}`, { method: 'PUT', body: fd }),
  deleteVisit:      id       => req(`/visits/${id}`, { method: 'DELETE' }),
  deleteAttachment: (vid, aid) => req(`/visits/${vid}/attachments/${aid}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: (p = {}) => req(`/analytics/summary?${new URLSearchParams(p)}`),

  // Reports
  getReport:       month => req(`/reports/monthly?month=${month}`),
  reportPdfUrl:    month => `${getApiBase()}/reports/monthly/pdf?month=${month}&_t=${Date.now()}`,
  reportExcelUrl:  month => `${getApiBase()}/reports/monthly/excel?month=${month}&_t=${Date.now()}`,

  // Auth / Users
  getUsers:        ()       => req('/auth/users'),
  createUser:      data     => req('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser:      (id, d)  => req(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteUser:      id       => req(`/auth/users/${id}`, { method: 'DELETE' }),
}
