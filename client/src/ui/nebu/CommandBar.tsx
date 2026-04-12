import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XiGlyph } from "@/ui/stix/XiGlyph";

const QUICK_COMMANDS = ["/zoom admit all", "/zoom mute all", "/zoom lock room", "/capture moment"] as const;

export function CommandBar({
  value,
  onChange,
  onSubmit,
  onQuickCommand,
  isExecuting,
  helperText,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onQuickCommand: (command: string) => void;
  isExecuting: boolean;
  helperText: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Command parser</h2>
        <XiGlyph state={isExecuting ? "signal" : "base"} label={isExecuting ? "executing" : "standby"} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Try /zoom mute all"
          className="font-mono"
        />
        <Button onClick={onSubmit} disabled={isExecuting} className="sm:min-w-24">
          {isExecuting ? "Running…" : "Run"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((quick) => (
          <Button key={quick} variant="outline" size="sm" onClick={() => onQuickCommand(quick)} className="font-mono text-xs">
            {quick}
          </Button>
        ))}
      </div>
    </div>
  );
}
