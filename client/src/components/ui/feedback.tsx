import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface FeedbackProps {
  type: "success" | "error" | "empty";
  title: string;
  description?: string;
  action?: ReactNode;
}

export function Feedback({ type, title, description, action }: FeedbackProps) {
  const iconMap = {
    error: <AlertCircle className="h-8 w-8 text-destructive" />,
    empty: <Sparkles className="h-8 w-8 text-primary" />,
    success: <CheckCircle2 className="h-8 w-8 text-emerald-400" />,
  };

  const surfaceTone = {
    error: "border-red-500/20 bg-red-500/10",
    empty: "border-primary/20 bg-primary/10",
    success: "border-emerald-500/20 bg-emerald-500/10",
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-card/70 px-6 py-14 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${surfaceTone[type]}`}>
        {iconMap[type]}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
