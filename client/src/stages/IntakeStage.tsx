import { useRef } from "react";
import { Zap, Sparkles, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortal } from "@/context/PortalContext";

// ─── IntakeStage ──────────────────────────────────────────────────────────────

export default function IntakeStage() {
  const { setStep, setActiveImage, setAura, activeImage } = usePortal();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setActiveImage(url);
    setAura("idle");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function advance() {
    setAura("processing");
    setStep("transform");
  }

  return (
    <div className="container mx-auto px-6 py-16 max-w-2xl space-y-10">
      {/* Headline */}
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          INTAKE
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          DROP YOUR IMAGE
        </h1>
        <p className="text-muted-foreground text-sm">
          SELECT AN IMAGE TO BEGIN THE MAGIC FLOW.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileRef.current?.click()}
        className={[
          "relative group rounded-2xl border-2 border-dashed cursor-pointer",
          "flex flex-col items-center justify-center gap-4 py-20 px-8 text-center",
          "transition-all duration-200 hover:border-primary/60 hover:bg-muted/30",
          activeImage
            ? "border-primary/40 bg-muted/20"
            : "border-border",
        ].join(" ")}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleInputChange}
        />

        {activeImage ? (
          <>
            <img
              src={activeImage}
              alt="Selected"
              className="max-h-48 max-w-full rounded-xl object-contain shadow-lg"
            />
            <p className="text-xs text-muted-foreground tracking-widest font-bold">
              IMAGE LOADED — CLICK TO REPLACE
            </p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-bold tracking-widest text-sm">
                DRAG & DROP OR CLICK
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP, GIF
              </p>
            </div>
          </>
        )}
      </div>

      {/* Sample / quick-select */}
      {!activeImage && (
        <div className="space-y-3">
          <p className="text-xs font-bold tracking-widest text-muted-foreground text-center">
            OR CHOOSE A SAMPLE
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {[
              "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=200&q=80",
              "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=80",
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80",
            ].map((url, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImage(url);
                  setAura("idle");
                }}
                className="rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all"
              >
                <img
                  src={url}
                  alt={`Sample ${i + 1}`}
                  className="h-20 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2 px-8 font-bold tracking-widest"
          disabled={!activeImage}
          onClick={advance}
        >
          <Zap className="h-4 w-4" />
          TRANSFORM
        </Button>
      </div>
    </div>
  );
}
