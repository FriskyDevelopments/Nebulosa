import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackProps {
  type: "success" | "error" | "empty";
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Renders a centered feedback UI for the "success", "error", or "empty" variant.
 *
 * @param props.type - One of `"success"`, `"error"`, or `"empty"` that selects the visual variant.
 * @param props.title - Title text displayed as an `<h3>`.
 * @param props.description - Optional descriptive text displayed beneath the title.
 * @param props.action - Optional React node rendered beneath the description (commonly actions like buttons).
 * @returns The feedback UI as a JSX element.
 */
export function Feedback({ type, title, description, action }: FeedbackProps) {
  if (type === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-2" />
        <h3 className="text-xl font-medium">{title}</h3>
        {description && <p className="text-muted-foreground max-w-md">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  if (type === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-medium">{title}</h3>
        {description && <p className="text-muted-foreground max-w-md mx-auto">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  // success
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-xl font-medium">{title}</h3>
      {description && <p className="text-muted-foreground max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
