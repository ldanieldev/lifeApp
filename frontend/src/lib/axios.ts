import Cookies from 'js-cookie';
import axios from 'redaxios';

export const lifeAppApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'X-CSRFToken': Cookies.get('csrftoken') || '',
    'Content-Type': 'application/json',
  },
});
