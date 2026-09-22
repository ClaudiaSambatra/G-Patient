import axios from "axios"

// Client Axios pour l'API Django REST Framework.
// L'URL de base vient d'une variable d'environnement (voir .env.example).
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
})

// Attache automatiquement le token JWT (stocké après connexion) à chaque requête.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Intercepteur pour gérer les erreurs de réponse (ex: token expiré)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si on reçoit une erreur 401 (Non autorisé) et qu'on n'est pas déjà sur la page login
    if (error.response?.status === 401 && typeof window !== "undefined") {
      if (window.location.pathname !== "/login") {
        window.localStorage.removeItem("access_token")
        window.localStorage.removeItem("refresh_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)
