import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Modal } from "./Modal"
import { MouvementStock, StockMedicament } from "./types"

export function HistoriqueModal({ medicament, onClose }: { medicament: StockMedicament; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-mouvements", medicament.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: MouvementStock[] }>(`/stocks/mouvements/?medicament=${medicament.id}`)
      return data.results || []
    },
  })

  return (
    <Modal titre={`Historique — ${medicament.libelle}`} onClose={onClose} large>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : !data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Variation</th>
              <th className="py-2 font-medium">Stock</th>
              <th className="py-2 font-medium">Motif / auteur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((m) => (
              <tr key={m.id}>
                <td className="py-2 pr-2 whitespace-nowrap text-xs">{new Date(m.date).toLocaleString("fr-FR")}</td>
                <td className="py-2 pr-2 text-xs">{m.type_display.split(" (")[0]}</td>
                <td className={`py-2 pr-2 font-semibold ${m.quantite < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {m.quantite > 0 ? "+" : ""}
                  {m.quantite}
                </td>
                <td className="py-2 pr-2">{m.quantite_apres}</td>
                <td className="py-2 text-xs text-muted-foreground">
                  {m.motif}
                  {m.auteur_nom && <span className="block">par {m.auteur_nom}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
