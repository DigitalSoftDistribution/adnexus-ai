import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md",
        shimmer
          ? "bg-white/[0.06] skeleton-shimmer"
          : "bg-accent animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
