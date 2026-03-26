import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground p-8">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
      </div>
      <Link href="/">
        <Button>
          <Home className="mr-2 h-4 w-4" />
          Go home
        </Button>
      </Link>
    </div>
  );
}
