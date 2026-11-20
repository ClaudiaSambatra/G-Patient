import { apiClient } from "@/lib/api-client"

// Les documents imprimables sont produits en PDF par le backend : un reçu au format ticket (80 mm),
// les ordonnances et demandes d'examens en A5. Le PDF est récupéré avec le jeton dans l'en-tête
// (jamais dans l'adresse), puis ouvert dans un nouvel onglet d'où l'on imprime.

async function messageErreur(erreur: unknown): Promise<string> {
  const reponse = (erreur as { response?: { data?: unknown } })?.response
  if (reponse?.data instanceof Blob) {
    try {
      const corps = JSON.parse(await reponse.data.text())
      if (typeof corps?.detail === "string") return corps.detail
    } catch {
      // Corps illisible : message générique ci-dessous
    }
  }
  return "Impossible de générer le document."
}

async function ouvrirPdf(chemin: string) {
  // L'onglet est ouvert tout de suite, pendant le clic : ouvert après l'attente, il serait bloqué par le navigateur.
  const onglet = window.open("", "_blank")
  try {
    const { data } = await apiClient.get<Blob>(chemin, { responseType: "blob" })
    const url = URL.createObjectURL(data)
    if (onglet) {
      onglet.location.href = url
    } else {
      window.open(url, "_blank")
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (erreur) {
    const message = await messageErreur(erreur)
    if (onglet) {
      onglet.document.title = "Document indisponible"
      onglet.document.body.textContent = message
    } else {
      window.alert(message)
    }
  }
}

export function imprimerRecu(factureId: number) {
  return ouvrirPdf(`/billing/factures/${factureId}/recu/`)
}

export function imprimerOrdonnance(ordonnance: { id: number }) {
  return ouvrirPdf(`/prescriptions/${ordonnance.id}/pdf/`)
}

export function imprimerDemandeExamen(demande: { id: number }) {
  return ouvrirPdf(`/examinations/${demande.id}/pdf/`)
}
