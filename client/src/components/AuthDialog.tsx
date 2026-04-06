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
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect your account</DialogTitle>
          <DialogDescription>
            Sign in with your preferred platform to access Stix Magic.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button className="w-full gap-2" size="lg" onClick={() => window.location.href = "/api/auth/zoom/init"}>
            Sign in with Zoom
          </Button>
          <Button className="w-full gap-2" variant="outline" size="lg" onClick={() => window.location.href = "/api/auth/telegram/init"}>
            <Bot className="h-4 w-4" />
            Sign in with Telegram
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
