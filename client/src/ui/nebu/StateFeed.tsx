import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function StateFeed<T>({
  title,
  items,
  emptyText,
  loading,
  renderItem,
}: {
  title: string;
  items: readonly T[];
  emptyText: string;
  loading?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card/70 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-2 max-h-72 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing…
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((item, index) => renderItem(item, index))
        )}
      </div>
    </section>
  );
}
