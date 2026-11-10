export interface Utilisateur {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: "ADMIN" | "MEDECIN" | "SECRETAIRE" | "PATIENT"
  telephone: string
  photo: string | null
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  date_joined: string
  last_login: string | null
}

export interface UserListResponse {
  count: number
  results: Utilisateur[]
}

export interface UserStatsResponse {
  total: number
  medecins: number
  secretaires: number
  admins: number
  actifs: number
  inactifs: number
}
