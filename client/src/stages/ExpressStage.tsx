import { useState } from "react";
import { Download, Share2, RotateCcw, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortal } from "@/context/PortalContext";

// ─── ExpressStage ─────────────────────────────────────────────────────────────

export default function ExpressStage() {
  const { activeImage, setStep, setAura, setActiveImage } = usePortal();
  const [copied, setCopied] = useState(false);

  function handleDownload() {
    if (!activeImage) return;
    const a = document.createElement("a");
    a.href = activeImage;
    a.download = "stixmagic-export.png";
    a.click();
  }

  async function handleCopy() {
    if (!activeImage) return;
    try {
      const res = await fetch(activeImage);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy URL
      await navigator.clipboard.writeText(activeImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleReset() {
    setActiveImage(null);
    setAura("idle");
    setStep("intake");
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-2xl space-y-10">
      {/* Headline */}
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          EXPRESS
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          EXPORT & SHARE
        </h1>
        <p className="text-muted-foreground text-sm tracking-wide">
          YOUR IMAGE IS READY. SEND IT, SAVE IT, SNAP IT.
        </p>
      </div>

      {/* Result preview */}
      {activeImage ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold tracking-widest text-muted-foreground">
              RESULT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center rounded-xl bg-muted/30 p-4">
              <img
                src={activeImage}
                alt="Export preview"
                className="max-h-64 max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="gap-2 font-bold tracking-widest"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                SAVE
              </Button>
              <Button
                variant="outline"
                className="gap-2 font-bold tracking-widest"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    COPY
                  </>
                )}
              </Button>
            </div>

            <Button
              className="w-full gap-2 font-bold tracking-widest"
              onClick={() => {
                if (navigator.share && activeImage) {
                  navigator.share({ url: activeImage }).catch(() => null);
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              SHARE
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed">
          <Sparkles className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground tracking-widest font-bold">
            NO IMAGE — GO BACK TO INTAKE
          </p>
        </div>
      )}

      {/* Aura states */}
      <div className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-muted-foreground text-center">
          AURA STATES
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          {(
            [
              { label: "SYNC", desc: "idle", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
              { label: "VOLT", desc: "processing", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
              { label: "FROST", desc: "result", color: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10" },
              { label: "VOID", desc: "—", color: "text-muted-foreground border-border bg-muted/20" },
            ] as const
          ).map(({ label, desc, color }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold tracking-widest ${color}`}
            >
              {label}
              <span className="opacity-50 font-normal normal-case tracking-normal">
                {desc}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground font-bold tracking-widest"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
          START OVER
        </Button>
      </div>
    </div>
  );
}
