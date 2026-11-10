import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  CreditCard, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Ban 
} from "lucide-react"
import { Facture } from "./types"

interface FacturesTableProps {
  data?: Facture[]
  isLoading: boolean
  isSecretaireOrAdmin: boolean
  isPendingEncaisser: boolean
  onEncaisser: (id: number) => void
  onPrintRecu: (id: number) => void
}

export function FacturesTable({
  data,
  isLoading,
  isSecretaireOrAdmin,
  isPendingEncaisser,
  onEncaisser,
  onPrintRecu,
}: FacturesTableProps) {
  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PAYEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-3" /> Payée
          </span>
        )
      case "IMPAYEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="size-3" /> Impayée
          </span>
        )
      case "ANNULEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300">
            <Ban className="size-3" /> Annulée
          </span>
        )
      default:
        return <span>{statut}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    if (type === "CONSULTATION") {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
          Consultation
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-300">
        Médicaments
      </span>
    )
  }

  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6">
        <CardTitle className="text-base font-semibold">Registre des factures</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
            Chargement des factures...
          </div>
        ) : data?.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <CreditCard className="mx-auto size-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">Aucune facture trouvée</p>
            <p className="text-xs mt-1">Modifiez vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-6">Réf &amp; Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Désignation</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data?.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 px-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">FAC-{f.id.toString().padStart(5, "0")}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="size-3" />
                          {new Date(f.date_creation).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {f.patient_nom} {f.patient_prenom}
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(f.type)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={f.designation || f.actes}>
                      {f.designation || f.actes}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {Number(f.montant).toLocaleString("fr-FR")} Ar
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(f.statut)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isSecretaireOrAdmin && f.statut === "IMPAYEE" && (
                          <Button
                            size="sm"
                            onClick={() => onEncaisser(f.id)}
                            disabled={isPendingEncaisser}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Encaisser
                          </Button>
                        )}

                        {f.statut === "PAYEE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPrintRecu(f.id)}
                            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                          >
                            <Printer className="size-3.5 mr-1" />
                            Reçu
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
