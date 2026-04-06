import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Zap, ArrowRight, Settings, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Show setup wizard if it hasn't been completed yet
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
      title: "Welcome to STIX MΛGIC ✨",
      description: "Let's get your unified platform set up.",
      icon: <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This quick wizard will help you configure your Telegram and Zoom integrations so you can start creating magic right away.
          </p>
        </div>
      )
    },
    {
      title: "Connect Telegram 🤖",
      description: "Link your BotFather token to enable Telegram features.",
      icon: <Bot className="h-12 w-12 text-secondary mx-auto mb-4" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            1. Open @BotFather on Telegram and create a new bot.<br/>
            2. Copy the HTTP API token.<br/>
            3. Paste it below to link your bot securely.
          </p>
          <div className="space-y-2">
            <Input type="password" placeholder="e.g., 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ" />
            <p className="text-xs text-muted-foreground">This is saved securely to your environment.</p>
          </div>
        </div>
      )
    },
    {
      title: "Zoom Integration 🎥",
      description: "Optional: Enable live meeting controls.",
      icon: <Settings className="h-12 w-12 text-accent mx-auto mb-4" />,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-muted-foreground">
            Connect your Zoom OAuth App to enable automatic pinning, muting, and operator controls from the Nebulosa dashboard.
          </p>
          <div className="space-y-2">
            <Input placeholder="Zoom Client ID" />
            <Input type="password" placeholder="Zoom Client Secret" />
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🎉",
      description: "STIX MΛGIC is ready to use.",
      icon: <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your platform is configured. You can now use the Telegram bot or the Magic Studio to generate sticker packs.
          </p>
        </div>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center p-6 border-primary/20 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl mb-2">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-base">
            {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {steps[step].icon}
          {steps[step].content}
        </div>

        <div className="flex justify-between items-center w-full mt-4">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <Button
            className="font-bold tracking-wide"
            onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : handleComplete()}
          >
            {step < steps.length - 1 ? "Next Step" : "Finish Setup"}
            {step < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
