import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import MagicCutDashboard from "@/pages/magic-cut";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MagicCutDashboard} />
      <Route path="/magic-cut" component={MagicCutDashboard} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
