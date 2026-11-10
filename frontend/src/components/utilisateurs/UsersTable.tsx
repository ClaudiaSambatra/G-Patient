import { RefreshCw, Users, Shield, Stethoscope, Briefcase, Mail, Phone, Edit3, Power, Trash2 } from "lucide-react"
import { Utilisateur, UserListResponse } from "./types"
import { CurrentUser } from "@/components/sidebar"

interface UsersTableProps {
  usersData?: UserListResponse
  isLoadingUsers: boolean
  currentUser?: CurrentUser
  onEditUser: (user: Utilisateur) => void
  onToggleActive: (user: Utilisateur) => void
  onDeleteUser: (user: Utilisateur) => void
}

export function UsersTable({
  usersData,
  isLoadingUsers,
  currentUser,
  onEditUser,
  onToggleActive,
  onDeleteUser,
}: UsersTableProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" id="table-users">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="py-3.5 pl-6 pr-4">Utilisateur</th>
              <th className="py-3.5 px-4">Rôle métier</th>
              <th className="py-3.5 px-4">Coordonnées</th>
              <th className="py-3.5 px-4">Statut</th>
              <th className="py-3.5 px-4">Créé le</th>
              <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoadingUsers ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto size-6 animate-spin mb-2 text-primary" />
                  Chargement des utilisateurs…
                </td>
              </tr>
            ) : usersData?.results?.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-muted-foreground">
                  <Users className="mx-auto size-10 mb-2 opacity-40" />
                  <p className="font-medium text-foreground">Aucun utilisateur trouvé</p>
                  <p className="text-xs mt-1">
                    Modifiez vos critères de recherche ou ajoutez un nouvel utilisateur.
                  </p>
                </td>
              </tr>
            ) : (
              usersData?.results.map((u) => {
                const isSelf = currentUser?.id === u.id
                const initials = (
                  (u.first_name?.[0] || u.username[0] || "U") +
                  (u.last_name?.[0] || "")
                ).toUpperCase()

                return (
                  <tr
                    key={u.id}
                    className="group transition-colors hover:bg-muted/30"
                    id={`user-row-${u.id}`}
                  >
                    {/* Identité */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        {u.photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={u.photo}
                            alt={u.first_name || u.username}
                            className="size-10 shrink-0 rounded-full object-cover border border-primary/20 shadow-xs"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-primary-foreground font-bold text-xs border border-primary/20">
                            {initials}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {u.first_name || u.last_name ? (
                              <span>
                                {u.first_name} {u.last_name}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground">Nom non renseigné</span>
                            )}
                            {isSelf && (
                              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rôle */}
                    <td className="py-4 px-4">
                      {u.role === "ADMIN" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-primary-foreground">
                          <Shield className="size-3 text-primary" />
                          Administrateur
                        </span>
                      )}
                      {u.role === "MEDECIN" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <Stethoscope className="size-3 text-emerald-500" />
                          Médecin
                        </span>
                      )}
                      {u.role === "SECRETAIRE" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
                          <Briefcase className="size-3 text-amber-500" />
                          Secrétaire
                        </span>
                      )}
                      {u.role === "PATIENT" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          Patient
                        </span>
                      )}
                    </td>

                    {/* Coordonnées */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Mail className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{u.email || "Non renseigné"}</span>
                        </div>
                        {u.telephone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="size-3.5 shrink-0" />
                            <span>{u.telephone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-4 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <span className="size-1.5 rounded-full bg-slate-400" />
                          Suspendu
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(u.date_joined).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEditUser(u)}
                          title="Modifier l'utilisateur"
                          id={`btn-edit-user-${u.id}`}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          <Edit3 className="size-4" />
                        </button>

                        <button
                          onClick={() => onToggleActive(u)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "Vous ne pouvez pas désactiver votre propre compte"
                              : u.is_active
                              ? "Suspendre le compte"
                              : "Activer le compte"
                          }
                          id={`btn-toggle-active-${u.id}`}
                          className={`rounded-lg p-2 transition-colors cursor-pointer ${
                            isSelf
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : u.is_active
                              ? "text-muted-foreground hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50"
                              : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50"
                          }`}
                        >
                          <Power className="size-4" />
                        </button>

                        <button
                          onClick={() => onDeleteUser(u)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "Vous ne pouvez pas supprimer votre propre compte"
                              : "Supprimer le compte"
                          }
                          id={`btn-delete-user-${u.id}`}
                          className={`rounded-lg p-2 transition-colors cursor-pointer ${
                            isSelf
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/50"
                          }`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
