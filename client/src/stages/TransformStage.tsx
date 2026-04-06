import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Package,
  Sparkles,
  Zap,
  Star,
  Crown,
  Shield,
  Layers,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Feedback } from "@/components/ui/feedback";
import { usePortal } from "@/context/PortalContext";
import { usePackBrowserState, type EmojiPack } from "@/hooks/usePackBrowserState";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  basic: <Package className="h-4 w-4" />,
  reactions: <Sparkles className="h-4 w-4" />,
  magic: <Zap className="h-4 w-4" />,
  symbols: <Layers className="h-4 w-4" />,
  premium: <Star className="h-4 w-4" />,
  experimental: <RefreshCw className="h-4 w-4" />,
};

const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  public: null,
  premium: <Star className="h-3 w-3" />,
  pro: <Crown className="h-3 w-3" />,
  admin_only: <Shield className="h-3 w-3" />,
};

const VISIBILITY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  public: "success",
  premium: "default",
  pro: "secondary",
  admin_only: "warning",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  active: "success",
  draft: "outline",
  archived: "secondary",
};

const CATEGORY_COLORS: Record<string, string> = {
  basic: "bg-blue-50 text-blue-700 border-blue-200",
  reactions: "bg-purple-50 text-purple-700 border-purple-200",
  magic: "bg-yellow-50 text-yellow-700 border-yellow-200",
  symbols: "bg-green-50 text-green-700 border-green-200",
  premium: "bg-orange-50 text-orange-700 border-orange-200",
  experimental: "bg-pink-50 text-pink-700 border-pink-200",
};

const ALL_CATEGORIES = ["all", "basic", "reactions", "magic", "symbols", "premium", "experimental"];

/**
 * Renders the Transform stage UI for browsing, searching, and selecting emoji project packs.
 *
 * Shows an active image preview when available, a search input and category filters,
 * and a responsive grid of project cards. Handles loading, error, and empty states
 * with shared placeholder and feedback components. Triggering an advance (via the
 * EXPRESS or Use actions) updates the portal aura to `"result"` and moves the step
 * to `"express"`.
 *
 * @returns The JSX element for the Transform stage UI.
 */

export default function TransformStage() {
  const { setStep, setAura, activeImage } = usePortal();
  const {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    filtered,
    isLoading,
    isError,
    refetch,
  } = usePackBrowserState();

  function advance() {
    setAura("result");
    setStep("express");
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Active image preview */}
      {activeImage && (
        <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-3">
          <img
            src={activeImage}
            alt="Active"
            className="h-14 w-14 rounded-lg object-cover border"
          />
          <div className="space-y-0.5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">
              ACTIVE IMAGE
            </p>
            <p className="text-sm font-medium">Ready for transformation</p>
          </div>
          <div className="ml-auto">
            <Button onClick={advance} size="sm" className="gap-2 font-bold tracking-widest">
              EXPRESS
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Page title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">TRANSFORM</h1>
        <p className="text-muted-foreground text-sm tracking-wide">
          BROWSE AND SELECT YOUR PROJECT PACK.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="capitalize"
            >
              {cat !== "all" && (
                <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
              )}
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Feedback
          type="error"
          title="Failed to load projects"
          action={<Button variant="outline" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" />Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <Feedback
          type="empty"
          title="No projects found"
          description={search || activeCategory !== "all" ? "Try adjusting your search or filters." : "Create your first project to get started."}
          action={!search && activeCategory === "all" ? <Button className="gap-2"><Plus className="h-4 w-4" />New project</Button> : null}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"} found
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pack) => (
              <ProjectCard key={pack.id} pack={pack} onAdvance={advance} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ pack, onAdvance }: { pack: EmojiPack; onAdvance: () => void }) {
  const visibilityIcon = VISIBILITY_ICONS[pack.visibility];
  const categoryColor = CATEGORY_COLORS[pack.category] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      {pack.coverImageUrl ? (
        <div className="h-32 w-full overflow-hidden rounded-t-lg bg-muted">
          <img
            src={pack.coverImageUrl}
            alt={pack.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 w-full rounded-t-lg gradient-bg flex items-center justify-center">
          <Zap className="h-10 w-10 text-white/80" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{pack.name}</CardTitle>
          <Badge variant={STATUS_VARIANTS[pack.status] ?? "outline"} className="shrink-0 capitalize">
            {pack.status}
          </Badge>
        </div>
        {pack.description && (
          <CardDescription className="line-clamp-2">{pack.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-2 flex-1">
        <p className="text-xs text-muted-foreground font-mono">/{pack.slug}</p>
      </CardContent>

      <CardFooter className="flex items-center gap-2 flex-wrap pt-0">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${categoryColor}`}
        >
          {CATEGORY_ICONS[pack.category]}
          {pack.category}
        </span>

        {pack.visibility !== "public" && (
          <Badge
            variant={VISIBILITY_VARIANTS[pack.visibility] ?? "outline"}
            className="gap-1 capitalize"
          >
            {visibilityIcon}
            {pack.visibility.replace("_", " ")}
          </Badge>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1 text-xs font-bold tracking-widest"
          onClick={onAdvance}
        >
          USE <ArrowRight className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}