import { Sparkles, Bot, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePortal, type Aura, type Step } from "@/context/PortalContext";
import IntakeStage from "@/stages/IntakeStage";
import TransformStage from "@/stages/TransformStage";
import ExpressStage from "@/stages/ExpressStage";

// ─── Aura badge ───────────────────────────────────────────────────────────────

const AURA_LABEL: Record<Aura, string> = {
  idle: "SYNC",
  processing: "VOLT",
  result: "FROST",
};

const AURA_CLASS: Record<Aura, string> = {
  idle: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  processing: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20 animate-pulse",
  result: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
};

// ─── Step tabs ────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "intake", label: "INTAKE" },
  { id: "transform", label: "TRANSFORM" },
  { id: "express", label: "EXPRESS" },
];

// ─── Stage renderer ───────────────────────────────────────────────────────────

function StageRenderer({ step }: { step: Step }) {
  switch (step) {
    case "intake":
      return <IntakeStage />;
    case "transform":
      return <TransformStage />;
    case "express":
      return <ExpressStage />;
  }
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { step, aura, setStep } = usePortal();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Persistent chrome */}
      <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-base font-bold tracking-tight">
              STIX M&#x39B;GIC
            </span>
          </div>

          {/* Step tabs */}
          <nav className="flex items-center gap-1 ml-4" aria-label="Flow steps">
            {STEPS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStep(id)}
                className={[
                  "px-3 py-1.5 rounded-md text-xs font-bold tracking-widest transition-colors",
                  step === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                ].join(" ")}
                aria-current={step === id ? "step" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto mr-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect your account</DialogTitle>
                  <DialogDescription>
                    Sign in with your preferred platform to access Stix Magic.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <Button className="w-full gap-2" size="lg" onClick={() => window.location.href = "/api/auth/zoom"}>
                    Sign in with Zoom
                  </Button>
                  <Button className="w-full gap-2" variant="outline" size="lg" onClick={() => window.location.href = "/api/auth/telegram"}>
                    <Bot className="h-4 w-4" />
                    Sign in with Telegram
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Aura indicator */}
          <div>
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-widest",
                AURA_CLASS[aura],
              ].join(" ")}
            >
              {AURA_LABEL[aura]}
            </span>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="h-px bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width:
                step === "intake"
                  ? "33.33%"
                  : step === "transform"
                    ? "66.66%"
                    : "100%",
            }}
          />
        </div>
      </header>

      {/* Stage content */}
      <main className="flex-1">
        <StageRenderer step={step} />
      </main>
    </div>
  );
}