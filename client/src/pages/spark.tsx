import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";

import { analytics } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmojiPack {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string;
  visibility: string;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

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

  useEffect(() => {
    analytics.track('landing_engagement', { page: 'spark' });
  }, []);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const searchDebounceTimeout = useRef<number | null>(null);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimeout.current) {
        clearTimeout(searchDebounceTimeout.current);
      }
    };
  }, []);

  const { data: packs = [], isLoading, isError, refetch } = useQuery<EmojiPack[]>({
    queryKey: ["/api/emoji/packs"],
    queryFn: async () => {
      const res = await fetch("/api/emoji/packs");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const filtered = packs.filter((pack) => {
    const matchesSearch =
      search === "" ||
      pack.name.toLowerCase().includes(search.toLowerCase()) ||
      (pack.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      pack.slug.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "all" || pack.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

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
            <Button className="gap-2" size="sm" onClick={() => analytics.track('flow_start', { flowName: 'create_project', source: 'header' })}>
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
              onChange={(e) => {
                const query = e.target.value;
                setSearch(query);

                // Clear existing timeout
                if (searchDebounceTimeout.current) {
                  clearTimeout(searchDebounceTimeout.current);
                }

                // Only track meaningful queries after debounce delay
                if (query.length > 2) {
                  searchDebounceTimeout.current = window.setTimeout(() => {
                    analytics.track('feature_interaction', { featureName: 'project_search', interactionData: { term: query } });
                  }, 300);
                }
              }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => {
                setActiveCategory(cat);
                analytics.track('feature_interaction', { featureName: 'category_filter', interactionData: { category: cat } });
              }}
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
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <p className="text-muted-foreground">Failed to load projects.</p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground">
                {search || activeCategory !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first project to get started."}
              </p>
            </div>
            {!search && activeCategory === "all" && (
              <Button className="gap-2" onClick={() => analytics.track('flow_start', { flowName: 'create_project', source: 'empty_state' })}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </div>
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

  const handleViewProject = useCallback(() => {
    analytics.track('feature_interaction', {
      featureName: 'view_project',
      interactionData: { projectId: pack.id, projectSlug: pack.slug }
    });
  }, [pack.id, pack.slug]);

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col cursor-pointer" onClick={handleViewProject}>
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