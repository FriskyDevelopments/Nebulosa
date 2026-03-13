/**
 * Magic Cut — Access Control Service
 *
 * Determines what a user can do based on their plan. Works with the
 * permissions table for granular, per-plan rules, with sensible
 * hard-coded defaults so the system works even before seed data is
 * added to the database.
 */

import type { IStorage } from "../storage";

// Plan slugs used throughout the business logic
export const PLAN_FREE = "free";
export const PLAN_PREMIUM = "premium";
export const PLAN_PRO = "pro";
export const PLAN_ENTERPRISE = "enterprise";

// The "visibility" levels a given plan can see
const PLAN_VISIBILITY_MAP: Record<string, string[]> = {
  [PLAN_FREE]: ["public"],
  [PLAN_PREMIUM]: ["public", "premium"],
  [PLAN_PRO]: ["public", "premium", "pro"],
  [PLAN_ENTERPRISE]: ["public", "premium", "pro", "admin_only"],
};

// Default plan permissions (used when the DB has no matching row)
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  [PLAN_FREE]: {
    "catalog_mask:use_basic": true,
    "catalog_mask:use_premium": false,
    "upload:create": true,
    "cut_job:create": true,
    "custom_submission:create": false,
  },
  [PLAN_PREMIUM]: {
    "catalog_mask:use_basic": true,
    "catalog_mask:use_premium": true,
    "upload:create": true,
    "cut_job:create": true,
    "custom_submission:create": true,
  },
  [PLAN_PRO]: {
    "catalog_mask:use_basic": true,
    "catalog_mask:use_premium": true,
    "upload:create": true,
    "cut_job:create": true,
    "custom_submission:create": true,
    "custom_submission:publish_priority": true,
  },
  [PLAN_ENTERPRISE]: {
    "catalog_mask:use_basic": true,
    "catalog_mask:use_premium": true,
    "upload:create": true,
    "cut_job:create": true,
    "custom_submission:create": true,
    "custom_submission:publish_priority": true,
  },
};

export interface UserAccess {
  planSlug: string;
  visibleVisibilities: string[];
  permissions: Record<string, boolean>;
}

export class AccessService {
  constructor(private storage: IStorage) {}

  /**
   * Returns what a user (by their Magic Cut user ID) is allowed to do.
   * Falls back to "free" defaults when the user or plan cannot be found.
   */
  async getUserAccess(magicCutUserId: number): Promise<UserAccess> {
    const user = await this.storage.getMagicCutUser(magicCutUserId);
    if (!user) {
      return this.buildAccess(PLAN_FREE, 1);
    }
    const plan = await this.storage.getPlan(user.planId);
    const planSlug = plan?.slug ?? PLAN_FREE;
    return this.buildAccess(planSlug, user.planId);
  }

  /**
   * Checks whether a specific resource:action is permitted for a plan.
   */
  async isAllowed(planId: number, resource: string, action: string): Promise<boolean> {
    // Try the DB first
    const dbPerm = await this.storage.getPermission(planId, resource, action);
    if (dbPerm !== undefined) return dbPerm;

    // Fall back to hard-coded defaults
    const plan = await this.storage.getPlan(planId);
    const slug = plan?.slug ?? PLAN_FREE;
    const key = `${resource}:${action}`;
    return DEFAULT_PERMISSIONS[slug]?.[key] ?? false;
  }

  /**
   * Returns the mask visibility levels the plan may browse.
   */
  getVisibleVisibilities(planSlug: string): string[] {
    return PLAN_VISIBILITY_MAP[planSlug] ?? PLAN_VISIBILITY_MAP[PLAN_FREE];
  }

  private async buildAccess(planSlug: string, planId: number): Promise<UserAccess> {
    const dbPerms = await this.storage.getPermissionsForPlan(planId);
    const perms: Record<string, boolean> = {
      ...(DEFAULT_PERMISSIONS[planSlug] ?? DEFAULT_PERMISSIONS[PLAN_FREE]),
    };
    // DB entries override defaults
    for (const p of dbPerms) {
      perms[`${p.resource}:${p.action}`] = p.isAllowed;
    }
    return {
      planSlug,
      visibleVisibilities: this.getVisibleVisibilities(planSlug),
      permissions: perms,
    };
  }
}
