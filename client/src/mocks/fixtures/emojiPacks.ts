import { EmojiPack } from "../types";

export const emojiPacksFixture: EmojiPack[] = [
  {
    id: 1,
    name: "Nebulosa Basics",
    slug: "nebulosa-basics",
    description: "The essential collection of Nebulosa standard emojis.",
    coverImageUrl: null,
    category: "basic",
    visibility: "public",
    status: "active",
    createdBy: "System",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Magic Reactions",
    slug: "magic-reactions",
    description: "Animated magical reactions for special moments.",
    coverImageUrl: null,
    category: "magic",
    visibility: "premium",
    status: "active",
    createdBy: "Creative Team",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Beta Symbols",
    slug: "beta-symbols",
    description: "Experimental symbols currently in testing phase.",
    coverImageUrl: null,
    category: "experimental",
    visibility: "admin_only",
    status: "draft",
    createdBy: "Dev Team",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];
