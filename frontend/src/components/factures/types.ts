export interface Facture {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  type: "CONSULTATION" | "MEDICAMENTS"
  type_display: string
  statut: "IMPAYEE" | "PAYEE" | "ANNULEE"
  statut_display: string
  designation: string
  actes: string
  montant: string
  rendez_vous?: number | null
  ordonnance?: number | null
  date_creation: string
  date_paiement?: string | null
  encaisse_par_nom?: string | null
}

export interface Patient {
  id: number
  nom: string
  prenom: string
}

export interface RdvOption {
  id: number
  date_heure: string
  medecin_nom?: string
  motif?: string
  facture?: number | null
}
