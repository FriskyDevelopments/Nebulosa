import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NebulosaDashboard from "@/pages/nebulosa-dashboard";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <NebulosaDashboard />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
