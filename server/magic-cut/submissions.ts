/**
 * Magic Cut — Mask Submission Service
 *
 * Handles the user-submitted mask workflow:
 *   upload → pending_review → approved/rejected → published to catalog
 */

import type { IStorage } from "../storage";
import type {
  InsertMaskSubmission,
  MaskSubmission,
  InsertCatalogMask,
} from "@shared/schema";

export class SubmissionService {
  constructor(private storage: IStorage) {}

  async createSubmission(data: InsertMaskSubmission): Promise<MaskSubmission> {
    return this.storage.createMaskSubmission({
      ...data,
      submissionStatus: "pending_review",
    });
  }

  async getSubmission(id: number): Promise<MaskSubmission | undefined> {
    return this.storage.getMaskSubmission(id);
  }

  async getSubmissionsByUser(userId: number): Promise<MaskSubmission[]> {
    return this.storage.getMaskSubmissionsByUser(userId);
  }

  // ─── Admin actions ────────────────────────────────────────────────────────

  async listPendingSubmissions(): Promise<MaskSubmission[]> {
    return this.storage.listMaskSubmissions("pending_review");
  }

  async listAllSubmissions(): Promise<MaskSubmission[]> {
    return this.storage.listMaskSubmissions();
  }

  async reviewSubmission(
    id: number,
    verdict: "approved" | "rejected" | "needs_changes",
    reviewNotes?: string,
  ): Promise<MaskSubmission | undefined> {
    return this.storage.updateMaskSubmission(id, {
      submissionStatus: verdict,
      reviewNotes: reviewNotes ?? null,
    });
  }

  /**
   * Publishes an approved submission to the catalog.
   * Marks the submission as "published" and creates a new catalog mask entry.
   */
  async publishToCatalog(submissionId: number): Promise<MaskSubmission | undefined> {
    const sub = await this.storage.getMaskSubmission(submissionId);
    if (!sub || sub.submissionStatus !== "approved") return undefined;

    const maskData: InsertCatalogMask = {
      name: sub.name,
      slug: sub.name.toLowerCase().replace(/\s+/g, "-"),
      description: sub.description ?? undefined,
      previewImageUrl: sub.previewImageUrl ?? undefined,
      maskFileUrl: sub.maskFileUrl ?? undefined,
      category: "custom",
      status: "active",
      visibility: "public",
      createdBy: sub.userId,
    };

    await this.storage.createCatalogMask(maskData);
    return this.storage.updateMaskSubmission(submissionId, {
      submissionStatus: "published",
    });
  }
}
