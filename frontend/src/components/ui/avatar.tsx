import * as React from "react"
import { cn } from "@/lib/utils"

export function Avatar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

export function AvatarImage({
  className,
  alt = "",
  ...props
}: React.ComponentProps<"img">) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      data-slot="avatar-image"
      alt={alt}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground font-medium",
        className
      )}
      {...props}
    />
  )
}
