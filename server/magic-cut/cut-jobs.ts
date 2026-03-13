/**
 * Magic Cut — Cut Job Service
 *
 * Creates and tracks image-cutting jobs.
 *
 * Architecture note: Jobs are created with status "queued" and can be
 * picked up by a separate worker process (e.g., BullMQ). This file
 * only handles job record management — actual image processing is
 * intentionally decoupled so it can be replaced or scaled independently.
 */

import type { IStorage } from "../storage";
import type { CutJob, InsertCutJob } from "@shared/schema";

export class CutJobService {
  constructor(private storage: IStorage) {}

  /**
   * Creates a new cut job and enqueues it for processing.
   * Returns the new job record (status = "queued").
   */
  async createJob(data: InsertCutJob): Promise<CutJob> {
    const job = await this.storage.createCutJob({
      ...data,
      jobStatus: "queued",
    });
    // TODO: push job.id to a BullMQ / Redis queue for async processing
    return job;
  }

  async getJob(id: number): Promise<CutJob | undefined> {
    return this.storage.getCutJob(id);
  }

  async getJobsByUser(userId: number): Promise<CutJob[]> {
    return this.storage.getCutJobsByUser(userId);
  }

  /**
   * Simulates job processing (for development/testing without a real worker).
   * In production this would be called from a background worker.
   */
  async processJob(jobId: number): Promise<CutJob | undefined> {
    const job = await this.storage.getCutJob(jobId);
    if (!job || job.jobStatus !== "queued") return job;

    await this.storage.updateCutJob(jobId, { jobStatus: "processing" });

    // Placeholder: in a real worker you would call the image-cutting engine here
    // and set outputFileUrl when done.
    const outputUrl = `/outputs/${jobId}.png`;
    return this.storage.updateCutJob(jobId, {
      jobStatus: "completed",
      outputFileUrl: outputUrl,
    });
  }
}
