import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import NebulosaDashboard from "@/pages/nebulosa-dashboard";
import Playground from "@/pages/playground";

/**
 * Root application component that provides global clients, UI providers, and page routing.
 *
 * Wraps the app with a React Query client and tooltip provider, renders global toasts, and
 * configures client-side routes for the dashboard and playground with the dashboard as a fallback.
 *
 * @returns The root JSX element for the application containing providers and route configuration.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={NebulosaDashboard} />
          <Route path="/playground" component={Playground} />
          {/* Keep NebulosaDashboard as a fallback for now or explicitly map it */}
          <Route component={NebulosaDashboard} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
