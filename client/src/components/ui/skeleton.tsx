import { cn } from "@/lib/utils"

/**
 * Renders a div used as a skeleton placeholder with pulse animation, rounded corners, and muted background.
 *
 * @param className - Optional additional CSS class names to merge with the component's default skeleton classes
 * @param props - Additional HTML attributes applied to the underlying div
 * @returns A JSX `div` element styled as a skeleton placeholder
 */
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

/**
 * Renders a card-shaped loading skeleton composed of animated placeholder blocks.
 *
 * The skeleton mimics a card layout with title and content lines and accepts additional
 * container CSS classes to customize sizing or spacing.
 *
 * @param className - Additional CSS classes to merge into the card container
 * @returns A JSX element representing the card loading skeleton
 */
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
