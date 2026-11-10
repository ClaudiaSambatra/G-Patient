export interface DocumentMedical {
  id: number
  nom: string
  fichier: string
  type_document: string
  date_depot: string
}

export interface Patient {
  id: number
  nom: string
  prenom: string
  sexe: "M" | "F"
  date_naissance: string
  age?: number
  contact: string
  adresse: string
  antecedents: string
  allergies: string
  groupe_sanguin: string
  documents?: DocumentMedical[]
  date_creation: string
  date_modification: string
}

export interface PatientListResponse {
  count: number
  results: Patient[]
}

export interface Consultation {
  id: number
  motif: string
  observations: string
  diagnostic: string
  date_consultation: string
  medecin_nom: string
}

export const GroupesSanguins = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function computeAgeFallback(dateNaissance: string): number | null {
  if (!dateNaissance) return null
  const birth = new Date(dateNaissance)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}
