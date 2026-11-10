export interface SecretaireDashboardData {
  role: "SECRETAIRE"
  total_patients: number
  nouveaux_patients_jour: number
  rdv_du_jour: number
  patients_en_attente: number
  rdv_a_confirmer: number
  consultations_realisees_jour: number
  factures_du_jour: number
  paiements_du_jour: number
  rdv_jour_liste: Array<{
    id: number
    heure: string
    patient_id: number
    patient_nom: string
    medecin_id: number
    medecin_nom: string
    type: string
    type_display: string
    statut: "PLANIFIE" | "CONFIRME" | "TERMINE" | "ANNULE"
    statut_display: string
    statut_paiement: "PAYE" | "IMPAYE" | "GRATUIT"
    motif: string
    consultation_id: number | null
    facture_id: number | null
  }>
  derniers_patients: Array<{
    id: number
    nom: string
    prenom: string
    contact: string
    date_creation: string
    age: number | null
    sexe: string
  }>
}

export interface MedecinDashboardData {
  role: "MEDECIN"
  rdv_du_jour: number
  patients_en_attente: number
  consultations_jour: number
  total_consultations: number
  suivis_recommandes_actifs: number
  suivis_programmes_a_venir: number
  suivis_realises: number
  patients_a_recevoir: Array<{
    rdv_id: number
    heure: string
    patient_id: number
    patient_nom: string
    patient_age: number | null
    patient_sexe: string
    type: string
    type_display: string
    statut: string
    statut_display: string
    motif: string
    en_attente: boolean
    consultation_terminee: boolean
    consultation_id: number | null
  }>
  prochains_suivis: Array<{
    id: number
    heure: string
    patient_id: number
    patient_nom: string
    motif: string
    statut: string
    statut_display: string
  }>
  suivis_en_attente_retour: Array<{
    consultation_id: number
    patient_id: number
    patient_nom: string
    date_consultation: string
    date_suivi_recommandee: string | null
    motif_suivi: string
  }>
}

export interface AdminDashboardData {
  role: "ADMIN"
  total_patients: number
  total_rdv: number
  rdv_du_jour: number
  total_consultations: number
  total_factures: number
  total_encaisse: number
  total_impaye: number
  taux_recouvrement: number
  factures_impayees: number
  medecins_actifs: number
  medecins_presents_jour: number
  evolution_consultations: Array<{
    date: string
    label: string
    total: number
  }>
  repartition_rdv: Array<{
    statut: string
    label: string
    count: number
    color: string
  }>
  activite_medecins: Array<{
    id: number
    medecin: string
    specialite: string
    consultations: number
    rdv_jour: number
    absent: boolean
  }>
  dernieres_activites: Array<{
    id: string
    type: "CONSULTATION" | "PATIENT" | "PAIEMENT"
    titre: string
    description: string
    date: string
    lien: string
  }>
}

export type AnyDashboardData = SecretaireDashboardData | MedecinDashboardData | AdminDashboardData
