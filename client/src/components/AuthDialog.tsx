import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuthDialog({ children }: { children?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            Open Access
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-white/15 bg-[#161925]/95 backdrop-blur-xl">
        <DialogHeader>
          <p className="nebu-kicker">Operator Authentication</p>
          <DialogTitle>Connect your control channel</DialogTitle>
          <DialogDescription>
            Authorize a platform below to unlock command routing and live session controls.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button className="w-full" size="lg" onClick={() => window.location.href = "/api/auth/zoom/init"}>
            Continue with Zoom
          </Button>
          <Button className="w-full gap-2" variant="outline" size="lg" onClick={() => window.location.href = "/api/auth/telegram/init"}>
            <Bot className="h-4 w-4" />
            Continue with Telegram
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
