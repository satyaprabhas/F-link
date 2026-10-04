const API_BASE = '/api';

const getHeaders = () => {
  const token = sessionStorage.getItem('flink_token') || localStorage.getItem('flink_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    sessionStorage.removeItem('flink_token');
    localStorage.removeItem('flink_token');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'API Error');
  return data;
};

const request = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers }
    });
    return handleResponse(res);
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Server unavailable - check connection');
    }
    throw error;
  }
};

export const api = {
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) })
  },
  dashboard: {
    get: () => request('/dashboard')
  },
  locations: {
    getAll: () => request('/locations'),
    getById: (id) => request(`/locations/${id}`),
    create: (data) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  inventory: {
    getAll: (locationId) => request(`/inventory${locationId ? '?location_id=' + locationId : ''}`),
    getByLocation: (locId) => request(`/inventory/${locId}`),
    create: (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  weather: {
    getAll: () => request('/weather'),
    getByLocation: (locId) => request(`/weather/location/${locId}`),
    getByRoute: (routeId) => request(`/weather/route/${routeId}`),
    create: (data) => request('/weather', { method: 'POST', body: JSON.stringify(data) })
  },
  routes: {
    getAll: () => request('/routes'),
    getById: (id) => request(`/routes/${id}`),
    compare: (from, to) => request(`/routes/compare?from=${from || ''}&to=${to || ''}`)
  },
  vehicles: {
    getAll: () => request('/vehicles'),
    getById: (id) => request(`/vehicles/${id}`),
    create: (data) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deliveries: {
    getAll: () => request('/deliveries'),
    getById: (id) => request(`/deliveries/${id}`),
    create: (data) => request('/deliveries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    completeDelivery: (id, data) => request(`/deliveries/${id}/deliver`, { method: 'POST', body: JSON.stringify(data || {}) })
  },
  resupply: {
    issueDirective: (data) => request('/resupply/directive', { method: 'POST', body: JSON.stringify(data) }),
    allotRations: (data) => request('/resupply/allot', { method: 'POST', body: JSON.stringify(data) })
  },
  alerts: {
    getAll: (params) => request(`/alerts${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    acknowledge: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
    resolve: (id) => request(`/alerts/${id}/resolve`, { method: 'PUT' })
  },
  forecast: {
    getByLocation: (locId) => request(`/forecast/${locId}`),
    getStockout: (locId) => request(`/forecast/${locId}/stockout`)
  },
  risk: {
    getByLocation: (locId) => request(`/risk/${locId}`),
    getByDelivery: (delId) => request(`/risk/delivery/${delId}`)
  },
  recommendations: {
    getAll: (params) => request(`/recommendations${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    getByLocation: (locId) => request(`/recommendations/${locId}`),
    decide: (id, decision) => request(`/recommendations/${id}/decide`, { method: 'POST', body: JSON.stringify(decision) }),
    generate: (locId) => request(`/recommendations/generate/${locId}`, { method: 'POST' })
  },
  simulate: {
    runWhatIf: (params) => request('/simulate', { method: 'POST', body: JSON.stringify(params) })
  },
  iot: {
    simulate: (data) => request('/iot/simulate', { method: 'POST', body: JSON.stringify(data) })
  },
  reports: {
    generate: (type) => request(`/reports/${type}`)
  },
  audit: {
    getAll: (params) => request(`/audit${params ? '?' + new URLSearchParams(params).toString() : ''}`)
  },
  settings: {
    getAll: () => request('/settings'),
    get: (key) => request(`/settings/${key}`),
    update: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) })
  },
  dataQuality: {
    check: () => request('/data-quality')
  },
  demo: {
    load: () => request('/demo/load', { method: 'POST' }),
    reset: () => request('/demo/reset', { method: 'POST' })
  }
};
