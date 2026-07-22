export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const getAbsoluteApiUrl = (path: string): string => {
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    return `${API_BASE}${path}`;
  }
  return `${window.location.origin}${API_BASE}${path}`;
};
