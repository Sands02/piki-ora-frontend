
import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pikiOraToken')

  if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  return config
})

export async function registerUser(username, email, password) {
  const response = await api.post('register/', {
    username,
    email,
    password,
  })

  return response.data
}

export async function loginUser(username, password) {
  const response = await api.post('token/', {
    username,
    password,
  })

  localStorage.setItem('pikiOraToken', response.data.token)

  return response.data
}

export function logoutUser() {
  localStorage.removeItem('pikiOraToken')
}
