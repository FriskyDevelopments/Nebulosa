/**
 * Magic Cut — Catalog Page
 *
 * Shows available cut masks filtered by the user's plan access.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = ["all", "basic", "rounded", "outline", "glow", "premium", "experimental", "custom"];

const VISIBILITY_BADGE: Record<string, string> = {
  public: "🟢 Free",
  premium: "⭐ Premium",
  pro: "🚀 Pro",
  admin_only: "🔒 Admin",
};

interface CatalogMask {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  previewImageUrl: string | null;
  category: string;
  status: string;
  visibility: string;
}

interface CatalogPageProps {
  userId?: number;
  onSelectMask?: (mask: CatalogMask) => void;
}

export default function CatalogPage({ userId, onSelectMask }: CatalogPageProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: masks = [], isLoading, error } = useQuery<CatalogMask[]>({
    queryKey: ["/api/catalog/masks", selectedCategory, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (userId) params.set("userId", String(userId));
      const res = await fetch(`/api/catalog/masks?${params}`);
      if (!res.ok) throw new Error("Failed to load masks");
      return res.json();
    },
  });

  return (
    <div className="magic-cut-catalog">
      <header className="catalog-header">
        <h1>✂️ Magic Cut Catalog</h1>
        <p>Choose a cut style for your sticker</p>
      </header>

      {/* Category filter */}
      <div className="catalog-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && <p className="loading">Loading masks…</p>}
      {error && <p className="error">Failed to load catalog. Please try again.</p>}

      {/* Mask grid */}
      <div className="mask-grid">
        {masks.map((mask) => (
          <div key={mask.id} className="mask-card">
            {mask.previewImageUrl ? (
              <img
                src={mask.previewImageUrl}
                alt={mask.name}
                className="mask-preview"
              />
            ) : (
              <div className="mask-preview mask-placeholder">✂️</div>
            )}

            <div className="mask-info">
              <h3>{mask.name}</h3>
              {mask.description && <p>{mask.description}</p>}
              <span className="access-badge">
                {VISIBILITY_BADGE[mask.visibility] ?? mask.visibility}
              </span>
            </div>

            <button
              className="use-mask-btn"
              onClick={() => onSelectMask?.(mask)}
            >
              Use Mask
            </button>
          </div>
        ))}

        {!isLoading && masks.length === 0 && (
          <p className="empty-state">No masks available for the selected filter.</p>
        )}
      </div>
    </div>
  );
}
