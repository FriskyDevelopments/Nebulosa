import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Sparkles, LayoutGrid } from "lucide-react";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { Feedback } from "@/components/ui/feedback";

/**
 * Page component that demonstrates UI states and component variants.
 *
 * Maintains local state to simulate a full-page loading overlay and to switch an interactive demo panel between "idle", "loading", "success", "error", and "empty" states. When global loading is active it shows a centered loading view; otherwise it renders controls and previews for loading components, feedback UI, status badges, and action elements.
 *
 * @returns The rendered JSX element for the Playground page.
 */
export default function Playground() {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "success" | "error" | "empty">("idle");

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <LayoutGrid className="w-8 h-8 text-primary" />
              UI Playground
            </h1>
            <p className="text-muted-foreground mt-2">A preview of visual system states used across the product.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={globalLoading ? "destructive" : "outline"}
              onClick={() => setGlobalLoading(!globalLoading)}
            >
              {globalLoading ? "Stop Global Loading" : "Simulate Global Loading"}
            </Button>
          </div>
        </header>

        {globalLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Simulating full page load...</p>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-xl font-semibold">Interactive States Demo</h2>
                <div className="flex gap-2 text-sm">
                  <Badge
                    variant={demoState === "idle" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDemoState("idle")}
                  >Idle</Badge>
                  <Badge
                    variant={demoState === "loading" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDemoState("loading")}
                  >Loading</Badge>
                  <Badge
                    variant={demoState === "success" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDemoState("success")}
                  >Success</Badge>
                  <Badge
                    variant={demoState === "error" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDemoState("error")}
                  >Error</Badge>
                  <Badge
                    variant={demoState === "empty" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDemoState("empty")}
                  >Empty</Badge>
                </div>
              </div>

              <Card className="min-h-[300px] flex items-center justify-center border-dashed">
                {demoState === "idle" && (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Select a state above to preview.</p>
                    <Button onClick={() => setDemoState("loading")}>Start Action</Button>
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
                    title="Action Completed"
                    description="The item was successfully processed and saved."
                    action={<Button variant="outline" onClick={() => setDemoState("idle")}>Reset</Button>}
                  />
                )}

                {demoState === "error" && (
                  <Feedback
                    type="error"
                    title="Failed to process"
                    description="There was a problem connecting to the server. Please try again."
                    action={<Button onClick={() => setDemoState("loading")}>Retry Action</Button>}
                  />
                )}

                {demoState === "empty" && (
                  <Feedback
                    type="empty"
                    title="No items found"
                    description="There are currently no items matching your criteria. Try adjusting your filters or create a new one."
                    action={<Button>Create New Item</Button>}
                  />
                )}
              </Card>
            </section>

            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Loading Components</h2>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Spinners</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-6">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <Button disabled>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Skeletons</CardTitle>
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
                <h2 className="text-xl font-semibold border-b pb-2">Feedback UI</h2>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-green-500/10 border-green-500/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-700 dark:text-green-400">Success Alert</h3>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80">Inline success message styling.</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-red-500/10 border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-700 dark:text-red-400">Error Alert</h3>
                      <p className="text-sm text-red-600/80 dark:text-red-400/80">Inline error message styling.</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-yellow-500/10 border-yellow-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-400">Warning Alert</h3>
                      <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80">Inline warning message styling.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Status Badges</h2>
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2 text-center">
                    <Badge variant="default">Default</Badge>
                    <p className="text-xs text-muted-foreground">Primary Status</p>
                  </div>
                  <div className="space-y-2 text-center">
                    <Badge variant="secondary">Secondary</Badge>
                    <p className="text-xs text-muted-foreground">Neutral Status</p>
                  </div>
                  <div className="space-y-2 text-center">
                    <Badge variant="outline">Outline</Badge>
                    <p className="text-xs text-muted-foreground">Ghost Status</p>
                  </div>
                  <div className="space-y-2 text-center">
                    <Badge variant="destructive">Destructive</Badge>
                    <p className="text-xs text-muted-foreground">Error/Danger</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Action Elements</h2>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="default">Primary Action</Button>
                  <Button variant="secondary">Secondary Action</Button>
                  <Button variant="outline">Outline Action</Button>
                  <Button variant="ghost">Ghost Action</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
