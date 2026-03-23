import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Step = "intake" | "transform" | "express";
export type Aura = "idle" | "processing" | "result";

export interface PortalState {
  step: Step;
  aura: Aura;
  activeImage: string | null;
}

export interface PortalActions {
  setStep: (step: Step) => void;
  setAura: (aura: Aura) => void;
  setActiveImage: (image: string | null) => void;
}

export type PortalContextValue = PortalState & PortalActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const PortalContext = createContext<PortalContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PortalProvider({ children }: { children: ReactNode }) {
  const [step, setStepState] = useState<Step>("intake");
  const [aura, setAuraState] = useState<Aura>("idle");
  const [activeImage, setActiveImageState] = useState<string | null>(null);

  const setStep = useCallback((next: Step) => {
    setStepState(next);
  }, []);

  const setAura = useCallback((next: Aura) => {
    setAuraState(next);
  }, []);

  const setActiveImage = useCallback((image: string | null) => {
    setActiveImageState(image);
  }, []);

  const value = useMemo<PortalContextValue>(
    () => ({ step, aura, activeImage, setStep, setAura, setActiveImage }),
    [step, aura, activeImage, setStep, setAura, setActiveImage],
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortal must be used inside <PortalProvider>");
  }
  return ctx;
}
