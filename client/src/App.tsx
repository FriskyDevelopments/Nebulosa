import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NebulosaDashboard from "@/pages/nebulosa-dashboard";

/**
 * Root application component that provides query and tooltip context and renders the main dashboard.
 *
 * The component wraps the app in a QueryClientProvider using the shared `queryClient`, provides tooltip
 * support via TooltipProvider, renders the global Toaster for notifications, and mounts the NebulosaDashboard.
 *
 * @returns The root React element containing QueryClientProvider, TooltipProvider, Toaster, and NebulosaDashboard.
 */
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
