import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/password', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const verifyEmail = (data) => api.post('/auth/verify-email', data);
export const resendVerification = () => api.post('/auth/resend-verification');
export const getUsers = () => api.get('/auth/users');
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data);

// Leads
export const getLeads = (params) => api.get('/leads', { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post('/leads', data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const bulkDeleteLeads = (ids) => api.post('/leads/bulk-delete', { ids });
export const bulkUpdateLeads = (ids, data) => api.put('/leads/bulk-update', { ids, data });
export const qualifyLead = (id, data) => api.post(`/leads/${id}/qualify`, data);
export const assignLead = (id, data) => api.post(`/leads/${id}/assign`, data);
export const convertLead = (id, data) => api.post(`/leads/${id}/convert`, data);
export const getLeadStats = () => api.get('/leads/stats/overview');
export const addFollowUp = (leadId, data) => api.post(`/leads/${leadId}/followups`, data);
export const completeFollowUp = (id, data) => api.put(`/leads/followups/${id}/complete`, data);
export const getPendingFollowUps = () => api.get('/leads/followups/pending');

// Surveys
export const getSurveys = (params) => api.get('/surveys', { params });
export const getSurvey = (id) => api.get(`/surveys/${id}`);
export const createSurvey = (data) => api.post('/surveys', data);
export const updateSurvey = (id, data) => api.put(`/surveys/${id}`, data);
export const completeSurvey = (id, data) => api.post(`/surveys/${id}/complete`, data);
export const addSurveyPhoto = (id, data) => api.post(`/surveys/${id}/photos`, data);
export const addSurveyInventory = (id, data) => api.post(`/surveys/${id}/inventory`, data);
export const getUpcomingSurveys = () => api.get('/surveys/scheduled/upcoming');

// Quotes
export const getQuotes = (params) => api.get('/quotes', { params });
export const getQuote = (id) => api.get(`/quotes/${id}`);
export const createQuote = (data) => api.post('/quotes', data);
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data);
export const sendQuote = (id) => api.post(`/quotes/${id}/send`);
export const acceptQuote = (id) => api.post(`/quotes/${id}/accept`);
export const rejectQuote = (id) => api.post(`/quotes/${id}/reject`);
export const cloneQuote = (id) => api.post(`/quotes/${id}/clone`);
export const bulkDeleteQuotes = (ids) => api.post('/quotes/bulk-delete', { ids });
export const bulkUpdateQuotes = (ids, data) => api.put('/quotes/bulk-update', { ids, data });

// Jobs
export const getJobs = (params) => api.get('/jobs', { params });
export const getJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (data) => api.post('/jobs', data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
export const updateJobStatus = (id, data) => api.put(`/jobs/${id}/status`, data);
export const assignCrew = (jobId, data) => api.post(`/jobs/${jobId}/crew`, data);
export const removeCrew = (jobId, crewId) => api.delete(`/jobs/${jobId}/crew/${crewId}`);
export const confirmCrew = (jobId, crewId) => api.post(`/jobs/${jobId}/crew/${crewId}/confirm`);
export const assignTruck = (jobId, data) => api.post(`/jobs/${jobId}/trucks`, data);
export const removeTruck = (jobId, truckId) => api.delete(`/jobs/${jobId}/trucks/${truckId}`);
export const assignEquipment = (jobId, data) => api.post(`/jobs/${jobId}/equipment`, data);
export const returnEquipment = (jobId, equipmentId, data) => api.post(`/jobs/${jobId}/equipment/${equipmentId}/return`, data);
export const addJobNote = (jobId, data) => api.post(`/jobs/${jobId}/notes`, data);
export const addTimeEntry = (jobId, data) => api.post(`/jobs/${jobId}/time`, data);
export const updateTimeEntry = (jobId, entryId, data) => api.put(`/jobs/${jobId}/time/${entryId}`, data);
export const getTodayJobs = () => api.get('/jobs/schedule/today');
export const getCalendarJobs = (params) => api.get('/jobs/schedule/calendar', { params });
export const bulkDeleteJobs = (ids) => api.post('/jobs/bulk-delete', { ids });
export const bulkUpdateJobs = (ids, data) => api.put('/jobs/bulk-update', { ids, data });

// Crew
export const getCrew = (params) => api.get('/crew', { params });
export const getCrewMember = (id) => api.get(`/crew/${id}`);
export const createCrewMember = (data) => api.post('/crew', data);
export const updateCrewMember = (id, data) => api.put(`/crew/${id}`, data);
export const deleteCrewMember = (id) => api.delete(`/crew/${id}`);
export const getCrewAvailability = (date) => api.get(`/crew/availability/${date}`);
export const getCrewSchedule = (id, params) => api.get(`/crew/${id}/schedule`, { params });
export const getCrewPerformance = (id) => api.get(`/crew/${id}/performance`);
export const bulkDeleteCrew = (ids) => api.post('/crew/bulk-delete', { ids });
export const bulkUpdateCrew = (ids, data) => api.put('/crew/bulk-update', { ids, data });

// Trucks
export const getTrucks = (params) => api.get('/trucks', { params });
export const getTruck = (id) => api.get(`/trucks/${id}`);
export const createTruck = (data) => api.post('/trucks', data);
export const updateTruck = (id, data) => api.put(`/trucks/${id}`, data);
export const deleteTruck = (id) => api.delete(`/trucks/${id}`);
export const getTruckAvailability = (date) => api.get(`/trucks/availability/${date}`);
export const updateTruckMileage = (id, data) => api.post(`/trucks/${id}/mileage`, data);
export const recordTruckService = (id, data) => api.post(`/trucks/${id}/service`, data);
export const getTrucksNeedingService = () => api.get('/trucks/maintenance/due');
export const bulkDeleteTrucks = (ids) => api.post('/trucks/bulk-delete', { ids });
export const bulkUpdateTrucks = (ids, data) => api.put('/trucks/bulk-update', { ids, data });

// Equipment
export const getEquipment = (params) => api.get('/equipment', { params });
export const getEquipmentItem = (id) => api.get(`/equipment/${id}`);
export const createEquipment = (data) => api.post('/equipment', data);
export const updateEquipment = (id, data) => api.put(`/equipment/${id}`, data);
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`);
export const getEquipmentAvailability = (params) => api.get('/equipment/availability/check', { params });
export const getLowStockEquipment = () => api.get('/equipment/stock/low');
export const adjustEquipmentQuantity = (id, data) => api.post(`/equipment/${id}/adjust`, data);
export const bulkDeleteEquipment = (ids) => api.post('/equipment/bulk-delete', { ids });
export const bulkUpdateEquipment = (ids, data) => api.put('/equipment/bulk-update', { ids, data });

// Storage
export const getStorageUnits = (params) => api.get('/storage/units', { params });
export const getStorageUnit = (id) => api.get(`/storage/units/${id}`);
export const createStorageUnit = (data) => api.post('/storage/units', data);
export const updateStorageUnit = (id, data) => api.put(`/storage/units/${id}`, data);
export const deleteStorageUnit = (id) => api.delete(`/storage/units/${id}`);
export const getStorageReservations = (params) => api.get('/storage/reservations', { params });
export const getStorageReservation = (id) => api.get(`/storage/reservations/${id}`);
export const createStorageReservation = (data) => api.post('/storage/reservations', data);
export const updateStorageReservation = (id, data) => api.put(`/storage/reservations/${id}`, data);
export const endStorageReservation = (id) => api.post(`/storage/reservations/${id}/end`);
export const getStorageStats = () => api.get('/storage/stats');

// Communications
export const getCommunications = (params) => api.get('/communications', { params });
export const sendCommunication = (data) => api.post('/communications', data);
export const sendBookingConfirmation = (data) => api.post('/communications/booking-confirmation', data);
export const sendPreMoveReminder = (data) => api.post('/communications/pre-move-reminder', data);
export const sendDayOfUpdate = (data) => api.post('/communications/day-of-update', data);
export const sendPostMoveFollowup = (data) => api.post('/communications/post-move-followup', data);
export const getTemplates = () => api.get('/communications/templates');
export const createTemplate = (data) => api.post('/communications/templates', data);
export const updateTemplate = (id, data) => api.put(`/communications/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/communications/templates/${id}`);

// Inventory
export const getInventory = (params) => api.get('/inventory', { params });
export const getInventoryItem = (id) => api.get(`/inventory/${id}`);
export const createInventoryItem = (data) => api.post('/inventory', data);
export const updateInventoryItem = (id, data) => api.put(`/inventory/${id}`, data);
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`);
export const loadInventoryItem = (id, data) => api.post(`/inventory/${id}/load`, data);
export const unloadInventoryItem = (id) => api.post(`/inventory/${id}/unload`);
export const verifyInventoryItem = (id, data) => api.post(`/inventory/${id}/verify`, data);
export const getJobInventorySummary = (jobId) => api.get(`/inventory/job/${jobId}/summary`);
export const bulkCreateInventory = (data) => api.post('/inventory/bulk', data);

// Invoices
export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const sendInvoice = (id) => api.post(`/invoices/${id}/send`);
export const addInvoiceCharge = (id, data) => api.post(`/invoices/${id}/charges`, data);
export const removeInvoiceCharge = (id, chargeId) => api.delete(`/invoices/${id}/charges/${chargeId}`);
export const recordPayment = (id, data) => api.post(`/invoices/${id}/payments`, data);
export const getOverdueInvoices = () => api.get('/invoices/overdue/list');
export const getInvoiceStats = () => api.get('/invoices/stats/overview');
export const bulkDeleteInvoices = (ids) => api.post('/invoices/bulk-delete', { ids });
export const bulkUpdateInvoices = (ids, data) => api.put('/invoices/bulk-update', { ids, data });

// Claims
export const getClaims = (params) => api.get('/claims', { params });
export const getClaim = (id) => api.get(`/claims/${id}`);
export const submitClaim = (data) => api.post('/claims', data);
export const updateClaim = (id, data) => api.put(`/claims/${id}`, data);
export const reviewClaim = (id) => api.post(`/claims/${id}/review`);
export const approveClaim = (id, data) => api.post(`/claims/${id}/approve`, data);
export const denyClaim = (id, data) => api.post(`/claims/${id}/deny`, data);
export const settleClaim = (id, data) => api.post(`/claims/${id}/settle`, data);
export const addClaimPhotos = (id, data) => api.post(`/claims/${id}/photos`, data);
export const getClaimStats = () => api.get('/claims/stats/overview');
export const bulkDeleteClaims = (ids) => api.post('/claims/bulk-delete', { ids });
export const bulkUpdateClaims = (ids, data) => api.put('/claims/bulk-update', { ids, data });

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const getRates = () => api.get('/settings/rates');
export const updateRates = (data) => api.put('/settings/rates', data);
export const getEnums = () => api.get('/settings/enums');

// AI
export const getVolumeEstimate = (data) => api.post('/ai/volume-estimate', data);
export const generateQuote = (data) => api.post('/ai/quote-generate', data);
export const optimizeCrew = (data) => api.post('/ai/crew-optimize', data);
export const planRoute = (data) => api.post('/ai/route-plan', data);
export const generateReviewResponse = (data) => api.post('/ai/review-response', data);
export const generateCommunication = (data) => api.post('/ai/communication-generate', data);
export const preMoveAnalyze = (data) => api.post('/ai/pre-move-analyze', data);
export const damageAssess = (data) => api.post('/ai/damage-assess', data);
export const marketRatePricing = (data) => api.post('/ai/market-rate-pricing', data);
export const predictiveCrewScheduling = (data) => api.post('/ai/predictive-crew-scheduling', data);
export const multiVendorLogistics = (data) => api.post('/ai/multi-vendor-logistics', data);

// Dashboard
export const getDashboardOverview = () => api.get('/dashboard/overview');
export const getTodaySchedule = () => api.get('/dashboard/today');
export const getRecentActivity = () => api.get('/dashboard/activity');
export const getPerformanceMetrics = () => api.get('/dashboard/metrics');
export const getRevenueChart = (params) => api.get('/dashboard/revenue-chart', { params });
export const getLeadSources = () => api.get('/dashboard/lead-sources');

export default api;
