import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "./Modal"
import { MouvementMode, StockMedicament } from "./types"

interface MouvementModalProps {
  mode: MouvementMode
  medicament: StockMedicament
  quantite: string
  setQuantite: (v: string) => void
  motif: string
  setMotif: (v: string) => void
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
}

export function MouvementModal({
  mode, medicament, quantite, setQuantite, motif, setMotif, onClose, onSubmit, isPending,
}: MouvementModalProps) {
  const entree = mode === "ENTREE"
  const ecart = !entree && quantite !== "" ? Number(quantite) - medicament.quantite : null

  return (
    <Modal titre={entree ? "Réception de stock" : "Inventaire / ajustement"} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        {medicament.libelle} — actuellement <strong className="text-foreground">{medicament.quantite} {medicament.unite}(s)</strong>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="mt-4 space-y-3"
      >
        <div className="space-y-1">
          <Label htmlFor="mvt-qte">{entree ? "Quantité reçue *" : "Quantité comptée en rayon *"}</Label>
          <Input id="mvt-qte" type="number" min={entree ? 1 : 0} required value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          {ecart !== null && ecart !== 0 && (
            <p className={`text-xs ${ecart < 0 ? "text-red-600" : "text-emerald-600"}`}>
              Écart : {ecart > 0 ? "+" : ""}
              {ecart}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="mvt-motif">{entree ? "Motif" : "Motif *"}</Label>
          <Input
            id="mvt-motif"
            required={!entree}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={entree ? "Ex : Livraison du grossiste" : "Ex : Inventaire mensuel, boîtes périmées"}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Valider"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
