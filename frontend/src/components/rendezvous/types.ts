export interface Patient {
  id: number
  nom: string
  prenom: string
  contact: string
}

export interface Medecin {
  id: number
  nom: string
  prenom: string
  email: string
  specialite: string
  numero_ordre?: string
  date_absence?: string | null
  absent_aujourdhui: boolean
}

export interface RendezVous {
  id: number
  patient: number
  patient_nom: string
  patient_contact: string
  patient_allergies?: string
  patient_antecedents?: string
  medecin: number
  medecin_nom: string
  medecin_absent_aujourdhui?: boolean
  date_heure: string
  statut: "PLANIFIE" | "CONFIRME" | "ANNULE" | "TERMINE"
  type: "CONSULTATION" | "CONTROLE"
  consultation_origine?: number | null
  statut_paiement: "PAYE" | "IMPAYE" | "GRATUIT"
  motif: string
  consultation_id?: number | null
  facture_id?: number | null
}

export interface ConstantesVitales {
  id?: number
  temperature?: string | number | null
  poids?: string | number | null
  taille?: string | number | null
  tension_arterielle?: string | null
  frequence_cardiaque?: number | null
  date_prise?: string
}

export interface ConsultationHistoriqueItem {
  id: number
  auteur: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_valeurs: Record<string, unknown>
  nouvelles_valeurs: Record<string, unknown>
}

export interface ConsultationData {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  patient_allergies?: string
  patient_antecedents?: string
  medecin: number
  medecin_nom: string
  rendez_vous: number | null
  date_consultation: string
  motif: string
  observations: string
  diagnostic: string
  compte_rendu?: string
  date_controle_recommandee?: string | null
  constantes?: ConstantesVitales | null
  historique?: ConsultationHistoriqueItem[]
  ordonnances?: Array<{
    id: number
    numero?: string
    statut?: string
    medicaments?: string
    posologie?: string
    duree?: string
    date_creation?: string
    medecin_nom?: string
    patient_nom?: string
    patient_prenom?: string
    lignes?: Array<{
      id?: number
      medicament: string
      dosage?: string
      forme?: string
      dose_par_prise?: string
      frequence?: string
      voie_administration?: string
      duree?: string
      instructions?: string
    }>
  }>
  examens?: Array<{
    id: number
    numero?: string
    statut?: string
    renseignements_cliniques?: string
    date_creation?: string
    medecin_nom?: string
    patient_nom?: string
    patient_prenom?: string
    lignes?: Array<{
      id?: number
      categorie?: string
      nom_examen: string
      instructions?: string
    }>
  }>
}

export interface RendezVousListResponse {
  count: number
  next: string | null
  previous: string | null
  results: RendezVous[]
}

export interface PatientListResponse {
  count: number
  results: Patient[]
}

export interface RdvFormState {
  patient: string
  medecin: string
  date: string
  heure: string
  type: "CONSULTATION" | "CONTROLE"
  motif: string
}

export interface ConsultFormState {
  motif: string
  observations: string
  diagnostic: string
  compte_rendu: string
  date_controle_recommandee: string
  constantes: {
    temperature: string
    poids: string
    taille: string
    tension_arterielle: string
    frequence_cardiaque: string
  }
}

export interface EditConsultFormState extends ConsultFormState {
  motif_correction: string
}

export interface EncaissementModalState {
  isOpen: boolean
  rdvId: number
  factureId: number
  montant: number
  patientNom: string
  isPaid: boolean
}

export interface ConsultationOrigineModalState {
  isOpen: boolean
  consultation: ConsultationData | null
  ordonnances: { id: number; numero?: string; medicaments: string; posologie: string; duree: string; date_creation: string }[]
  loading: boolean
}

export const TIME_SLOTS_30MIN = [
  "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30"
]

export function computeBMI(poids?: string | number | null, taille?: string | number | null) {
  if (!poids || !taille) return null
  const p = typeof poids === "string" ? parseFloat(poids) : poids
  const t = typeof taille === "string" ? parseFloat(taille) : taille
  if (!p || !t || p <= 0 || t <= 0) return null
  const hM = t / 100
  const imc = p / (hM * hM)
  if (isNaN(imc) || imc <= 0) return null
  const val = Math.round(imc * 10) / 10
  let label = "Corpulence normale"
  let color = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
  if (val < 18.5) {
    label = "Insuffisance pondérale"
    color = "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800"
  } else if (val >= 25 && val < 30) {
    label = "Surpoids"
    color = "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
  } else if (val >= 30) {
    label = "Obésité"
    color = "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
  }
  return { val, label, color }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { data?: Record<string, unknown> } }).response
    if (resp?.data) {
      if (resp.data.date_heure) {
        const val = resp.data.date_heure
        return Array.isArray(val) ? val.join(" ") : String(val)
      }
      if (resp.data.statut) {
        const val = resp.data.statut
        return Array.isArray(val) ? val.join(" ") : String(val)
      }
      if (resp.data.detail) {
        return String(resp.data.detail)
      }
      if (resp.data.rendez_vous) {
        const val = resp.data.rendez_vous
        return Array.isArray(val) ? val.join(" ") : String(val)
      }
      const firstKey = Object.keys(resp.data)[0]
      if (firstKey) {
        const val = resp.data[firstKey]
        return `${firstKey}: ${Array.isArray(val) ? val.join(" ") : String(val)}`
      }
    }
  }
  return fallback
}
