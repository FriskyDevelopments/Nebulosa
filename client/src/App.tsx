import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortalProvider } from "@/context/PortalContext";
import AppShell from "@/components/AppShell";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PortalProvider>
          <Toaster />
          <AppShell />
        </PortalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
