const API_BASE = "https://rvs-itech.onrender.com";

function getToken() {
  return sessionStorage.getItem('od_token');
}

function getUser() {
  const raw = sessionStorage.getItem('od_user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(data) {
  sessionStorage.setItem('od_token', data.token);
  sessionStorage.setItem(
    'od_user',
    JSON.stringify({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      department: data.department,
      className: data.className,
      regNo: data.regNo,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
    })
  );
}

function logout() {
  sessionStorage.removeItem('od_token');
  sessionStorage.removeItem('od_user');
  window.location.href = '/index.html';
}

function requireRole(expectedRole) {
  const user = getUser();
  const token = getToken();
  if (!token || !user) {
    window.location.href = '/index.html';
    return null;
  }
  if (user.role !== expectedRole) {
    alert(`This page is for ${expectedRole}s only. Redirecting to login.`);
    logout();
    return null;
  }
  return user;
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}