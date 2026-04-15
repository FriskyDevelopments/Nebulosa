import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, ArrowRight, Settings, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("stixmagic_setup_complete");
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("stixmagic_setup_complete", "true");
    setOpen(false);
  };

  const steps = [
    {
      title: "Welcome to NEBU Control",
      description: "A short setup pass to bring your command stack online.",
      icon: <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            You are two steps away from a live control loop. Connect your channels now so command routing and telemetry stay synchronized.
          </p>
        </div>
      )
    },
    {
      title: "Link Telegram",
      description: "Attach your bot token for outbound command updates.",
      icon: <Bot className="mx-auto mb-4 h-12 w-12 text-secondary" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            Create a bot in @BotFather, copy the API token, then paste it below. We use this channel for alerts and command confirmations.
          </p>
          <div className="space-y-2">
            <Input type="password" placeholder="Telegram bot token" />
            <p className="text-xs text-muted-foreground">Stored securely in your runtime environment.</p>
          </div>
        </div>
      )
    },
    {
      title: "Add Zoom access (optional)",
      description: "Enable real-time room controls from this console.",
      icon: <Settings className="mx-auto mb-4 h-12 w-12 text-accent" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            Connect your Zoom OAuth credentials to unlock admit, mute, lock, and capture workflows directly from NEBU.
          </p>
          <div className="space-y-2">
            <Input placeholder="Zoom Client ID" />
            <Input type="password" placeholder="Zoom Client Secret" />
          </div>
        </div>
      )
    },
    {
      title: "Console ready",
      description: "Your core channels are configured.",
      icon: <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            Setup is complete. You can now run command flows, monitor alerts, and control active sessions from one interface.
          </p>
        </div>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-white/15 bg-[#161925]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <p className="nebu-kicker">Onboarding</p>
          <DialogTitle className="mb-2 text-2xl">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-base">
            {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {steps[step].icon}
          {steps[step].content}
        </div>

        <div className="mt-4 flex w-full items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-white/10"}`}
              />
            ))}
          </div>
          <Button
            onClick={() => step < steps.length - 1 ? setStep((s) => s + 1) : handleComplete()}
          >
            {step < steps.length - 1 ? "Continue" : "Enter Console"}
            {step < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
