import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8080/api/v2/auth' });

export const register = (data) => API.post('/register', data);
export const login = (data) => API.post('/login', data);
