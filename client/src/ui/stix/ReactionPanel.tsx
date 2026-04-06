import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StixReaction } from "@/core/system/pipeline";

export function ReactionPanel({ reactions }: { reactions: StixReaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>STIX Reaction Engine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[30rem] overflow-auto">
        {reactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reactions yet. Run /capture moment to start the stream.</p>
        ) : (
          reactions.map((reaction) => (
            <div key={reaction.id} className="rounded-md border p-2 text-sm">
              <div className="font-medium">{reaction.text}</div>
              <div className="text-xs text-muted-foreground">
                mood={reaction.mood} · confidence {(reaction.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
