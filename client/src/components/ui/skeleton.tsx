import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border rounded-xl p-6 bg-card text-card-foreground shadow-sm animate-pulse", className)}>
      <div className="flex flex-col space-y-1.5 p-0 mb-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full mt-2" />
      </div>
      <div className="p-0">
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton }
