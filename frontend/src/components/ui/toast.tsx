"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastMessage {
  id: string
  type: "success" | "error" | "info"
  title?: string
  message: string
}

interface ToastContextValue {
  toast: (options: { type: "success" | "error" | "info"; title?: string; message: string }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const toast = React.useCallback(
    ({ type, title, message }: { type: "success" | "error" | "info"; title?: string; message: string }) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, type, title, message }])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    []
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white dark:bg-card shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 text-sm",
              t.type === "success" && "border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-100",
              t.type === "error" && "border-red-200 dark:border-red-800/40 text-slate-800 dark:text-slate-100",
              t.type === "info" && "border-slate-200 dark:border-border text-slate-800 dark:text-slate-100"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              {t.title && <p className="font-semibold text-slate-900 dark:text-white leading-tight">{t.title}</p>}
              <p className={cn("text-slate-600 dark:text-slate-300", t.title && "mt-0.5 text-xs")}>{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
