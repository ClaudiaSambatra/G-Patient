import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { LigneOrdonnance, FORMES_PHARMACEUTIQUES, VOIES_ADMINISTRATION } from "./types"
import { StockMedicament, formatAriary } from "@/components/stocks/types"

interface OrdonnanceLignesFormProps {
  lignes: LigneOrdonnance[]
  onAddLine: () => void
  onUpdateLine: (index: number, field: keyof LigneOrdonnance, value: string) => void
  onRemoveLine: (index: number) => void
  title?: string
}

export function OrdonnanceLignesForm({
  lignes,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  title = "Médicaments prescrits",
}: OrdonnanceLignesFormProps) {
  // Catalogue de la pharmacie du cabinet (médicaments actifs)
  const { data: catalogue = [] } = useQuery({
    queryKey: ["stocks", "catalogue-actif"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: StockMedicament[] }>("/stocks/medicaments/?actif=1&page_size=500")
      return data.results || []
    },
  })

  const choisirDansLeStock = (idx: number, id: string) => {
    onUpdateLine(idx, "medicament_stock", id)
    const med = catalogue.find((m) => String(m.id) === id)
    if (med) {
      onUpdateLine(idx, "medicament", med.nom)
      onUpdateLine(idx, "dosage", med.dosage)
      if (med.forme) onUpdateLine(idx, "forme", med.forme)
      if (!lignes[idx].quantite) onUpdateLine(idx, "quantite", "1")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title} ({lignes.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddLine}
          className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
        >
          <Plus className="size-3.5" /> Ajouter un médicament
        </Button>
      </div>

      <div className="space-y-3">
        {lignes.map((ligne, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-xs font-bold text-foreground">
                Médicament n°{idx + 1}
              </span>
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveLine(idx)}
                  className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" /> Supprimer
                </button>
              )}
            </div>

            {(() => {
              const stockId = ligne.medicament_stock ? String(ligne.medicament_stock) : ""
              const med = catalogue.find((m) => String(m.id) === stockId)
              const quantite = Number(ligne.quantite || 1)
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-background/60 p-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Délivré par le cabinet ?</Label>
                    <select
                      value={stockId}
                      onChange={(e) => choisirDansLeStock(idx, e.target.value)}
                      className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Non : pharmacie extérieure (texte libre)</option>
                      {catalogue.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.quantite === 0 && String(m.id) !== stockId}>
                          {m.libelle} · {m.quantite} en stock · {formatAriary(m.prix_unitaire)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {stockId && (
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité à délivrer ({med?.unite || "unité"})</Label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={ligne.quantite ?? "1"}
                        onChange={(e) => onUpdateLine(idx, "quantite", e.target.value)}
                        className="rounded-xl h-9"
                      />
                      {med && quantite > med.quantite && (
                        <p className="text-[11px] text-amber-700">Seulement {med.quantite} en stock.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Nom du médicament *</Label>
                <Input
                  required
                  readOnly={Boolean(ligne.medicament_stock)}
                  title={ligne.medicament_stock ? "Repris du stock du cabinet" : undefined}
                  placeholder="Ex : Amoxicilline"
                  value={ligne.medicament}
                  onChange={(e) => onUpdateLine(idx, "medicament", e.target.value)}
                  className="rounded-xl h-9 read-only:bg-muted/60 read-only:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dosage / Concentration</Label>
                <Input
                  readOnly={Boolean(ligne.medicament_stock)}
                  placeholder="Ex : 500 mg, 1 g"
                  value={ligne.dosage || ""}
                  onChange={(e) => onUpdateLine(idx, "dosage", e.target.value)}
                  className="rounded-xl h-9 read-only:bg-muted/60 read-only:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Forme</Label>
                <select
                  disabled={Boolean(ligne.medicament_stock)}
                  value={ligne.forme || "Comprimé"}
                  onChange={(e) => onUpdateLine(idx, "forme", e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
                >
                  {FORMES_PHARMACEUTIQUES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dose par prise</Label>
                <Input
                  placeholder="Ex : 1 cp, 1 cuillère"
                  value={ligne.dose_par_prise || ""}
                  onChange={(e) => onUpdateLine(idx, "dose_par_prise", e.target.value)}
                  className="rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Voie d&apos;administration</Label>
                <select
                  value={ligne.voie_administration || "ORALE"}
                  onChange={(e) => onUpdateLine(idx, "voie_administration", e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {VOIES_ADMINISTRATION.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fréquence / Prises *</Label>
                <Input
                  required
                  placeholder="Ex : 3 fois par jour, Matin et soir"
                  value={ligne.frequence || ""}
                  onChange={(e) => onUpdateLine(idx, "frequence", e.target.value)}
                  className="rounded-xl h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Durée *</Label>
                <Input
                  required
                  placeholder="Ex : 7 jours, 1 mois"
                  value={ligne.duree || ""}
                  onChange={(e) => onUpdateLine(idx, "duree", e.target.value)}
                  className="rounded-xl h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instructions particulières</Label>
              <Input
                placeholder="Ex : Prendre au milieu des repas, bien agiter avant emploi"
                value={ligne.instructions || ""}
                onChange={(e) => onUpdateLine(idx, "instructions", e.target.value)}
                className="rounded-xl h-9"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
