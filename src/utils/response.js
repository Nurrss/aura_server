// response.js
export const ok = (res, data = {}) => res.json({ success: true, data });
export const fail = (res, message = 'Error', status = 400) =>
  res.status(status).json({ success: false, error: message });
