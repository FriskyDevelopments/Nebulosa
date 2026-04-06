import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Zap,
  Search,
  Plus,
  Package,
  Sparkles,
  Star,
  Crown,
  Shield,
  Layers,
  RefreshCw,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Feedback } from "@/components/ui/feedback";
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SparkPage() {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Spark</span>
          </div>
          <span className="text-muted-foreground text-sm hidden sm:inline">
            — where you find your projects
          </span>
          <div className="ml-auto">
            <Button className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Page title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
          <p className="text-muted-foreground">
            Browse and manage your emoji packs and creative projects.
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
                <ProjectCard key={pack.id} pack={pack} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ pack }: { pack: EmojiPack }) {
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

        {pack.createdBy && (
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-[100px]">
            {pack.createdBy}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}