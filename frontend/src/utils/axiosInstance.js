import axios from 'axios'
import { API_BASE } from '../config'

const TOKEN_KEY = 'logtrace_token'

const axiosInstance = axios.create({
  baseURL: API_BASE,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default axiosInstance
