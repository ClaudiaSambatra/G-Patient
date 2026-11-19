import { X } from "lucide-react"

interface ModalProps {
  titre: string
  onClose: () => void
  children: React.ReactNode
  large?: boolean
}

export function Modal({ titre, onClose, children, large }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className={`w-full ${large ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl`}>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-semibold">{titre}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
