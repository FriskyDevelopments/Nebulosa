import { Xi } from "@/components/Xi";

export function XiGlyph({
  state,
  label,
  size = 22,
}: {
  state: "base" | "active" | "signal";
  label?: string;
  size?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <Xi state={state} size={size} />
      {label ? <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span> : null}
    </div>
  );
}
