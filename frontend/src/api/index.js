import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/login')) {
      sessionStorage.removeItem('token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const getUserDirectory = () => api.get('/auth/users/directory');

export const listMatters = () => api.get('/legal-documents/matters');
export const createMatter = (data) => api.post('/legal-documents/matters', data);
export const getMatter = (matterId) => api.get(`/legal-documents/matters/${matterId}`);
export const grantMatterAccess = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/access`, data);
export const revokeMatterAccess = (matterId, userId, data) => api.delete(`/legal-documents/matters/${matterId}/access/${userId}`, { data });
export const uploadDocument = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/documents/upload`, data);
export const reviseDocument = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/versions`, data);
export const extractDocument = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/ocr`, data);
export const getDocumentContent = (documentId) => api.get(`/legal-documents/documents/${documentId}/content`, { responseType: 'blob' });
export const listTemplates = (matterId) => api.get(`/legal-documents/matters/${matterId}/templates`);
export const syncTemplates = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/templates/sync`, data);
export const generateDocument = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/documents/generate`, data);
export const reviewDocument = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/review`, data);
export const requestSignature = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/signature`, data);
export const requestFiling = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/filing`, data);
export const applyLegalHold = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/legal-hold`, data);
export const releaseLegalHold = (matterId, data) => api.post(`/legal-documents/matters/${matterId}/legal-hold/release`, data);
export const disposeDocument = (documentId, data) => api.post(`/legal-documents/documents/${documentId}/disposition`, data);
export const exportMatter = (matterId) => api.get(`/legal-documents/matters/${matterId}/export`);
export const verifyAudit = (matterId) => api.get(`/legal-documents/matters/${matterId}/audit/verify`);

export default api;
