/**
 * Magic Cut — Catalog Service
 *
 * Handles browsing and filtering of cut masks in the platform catalog.
 */

import type { IStorage } from "../storage";
import type { UserAccess } from "./access";

export interface CatalogFilter {
  category?: string;
  status?: string;
  visibilities?: string[]; // derived from the user's plan
}

export class CatalogService {
  constructor(private storage: IStorage) {}

  /**
   * Returns the list of masks the user is allowed to see, filtered by the
   * optional category/status parameters.
   */
  async listMasks(access: UserAccess, filter: CatalogFilter = {}) {
    const visibilities = filter.visibilities ?? access.visibleVisibilities;
    return this.storage.listCatalogMasks({
      category: filter.category,
      status: filter.status ?? "active",
      visibilities,
    });
  }

  async getMask(id: number) {
    return this.storage.getCatalogMask(id);
  }
}
