import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, LayoutGrid } from "lucide-react";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { Feedback } from "@/components/ui/feedback";

export default function Playground() {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "success" | "error" | "empty">("idle");

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="nebu-kicker">NEBU Visual Lab</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
              <LayoutGrid className="h-8 w-8 text-primary" />
              State Consistency Review
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Every major state used in the product, validated against a single visual and tonal system.</p>
          </div>
          <Button variant={globalLoading ? "destructive" : "outline"} onClick={() => setGlobalLoading(!globalLoading)}>
            {globalLoading ? "Stop simulation" : "Simulate full-screen load"}
          </Button>
        </header>

        {globalLoading ? (
          <div className="nebu-panel flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparing control surfaces…</p>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2">
                <h2 className="text-lg font-semibold">Interactive state module</h2>
                <div className="flex flex-wrap gap-2 text-sm">
                  {(["idle", "loading", "success", "error", "empty"] as const).map((state) => (
                    <Badge
                      key={state}
                      variant={demoState === state ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => setDemoState(state)}
                    >
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>

              <Card className="min-h-[300px] border-dashed border-white/20 flex items-center justify-center">
                {demoState === "idle" && (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">Select a state to validate copy, spacing, and feedback rhythm.</p>
                    <Button onClick={() => setDemoState("loading")}>Run demo flow</Button>
                  </div>
                )}

                {demoState === "loading" && (
                  <div className="w-full p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <CardSkeleton />
                      <CardSkeleton />
                      <CardSkeleton />
                    </div>
                  </div>
                )}

                {demoState === "success" && (
                  <Feedback
                    type="success"
                    title="Execution complete"
                    description="The command package was processed and synced to active channels."
                    action={<Button variant="outline" onClick={() => setDemoState("idle")}>Reset preview</Button>}
                  />
                )}

                {demoState === "error" && (
                  <Feedback
                    type="error"
                    title="Command path interrupted"
                    description="Connection to the runtime API was lost. Retry when the channel stabilizes."
                    action={<Button onClick={() => setDemoState("loading")}>Retry sequence</Button>}
                  />
                )}

                {demoState === "empty" && (
                  <Feedback
                    type="empty"
                    title="No active records"
                    description="There is no data in this view yet. Start by creating your first command run."
                    action={<Button>Create command</Button>}
                  />
                )}
              </Card>
            </section>

            <div className="grid gap-8 md:grid-cols-2">
              <section className="space-y-4">
                <h2 className="border-b border-white/10 pb-2 text-lg font-semibold">Loading surfaces</h2>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Spinner behavior</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-6">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Skeleton rhythm</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="border-b border-white/10 pb-2 text-lg font-semibold">Inline feedback</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                    <div>
                      <h3 className="font-medium text-emerald-200">Sync confirmed</h3>
                      <p className="text-sm text-emerald-200/80">All active channels received the latest payload.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                    <div>
                      <h3 className="font-medium text-red-200">Action blocked</h3>
                      <p className="text-sm text-red-200/80">The request was rejected by policy constraints.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
                    <div>
                      <h3 className="font-medium text-amber-200">Operator check required</h3>
                      <p className="text-sm text-amber-200/80">Review the queue before sending the next command wave.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
