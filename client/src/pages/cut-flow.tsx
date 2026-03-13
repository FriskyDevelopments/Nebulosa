/**
 * Magic Cut — Cut Flow Page
 *
 * Step-by-step flow:
 *   Upload Image → Choose Mask → Start Cut → View Result
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import CatalogPage from "./catalog";

type Step = "upload" | "choose-mask" | "processing" | "result";

interface CatalogMask {
  id: number;
  name: string;
  visibility: string;
  previewImageUrl: string | null;
}

interface CutJob {
  id: number;
  jobStatus: string;
  outputFileUrl: string | null;
  errorMessage: string | null;
}

interface CutFlowPageProps {
  userId: number;
}

export default function CutFlowPage({ userId }: CutFlowPageProps) {
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [selectedMask, setSelectedMask] = useState<CatalogMask | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);

  // ─── Step 1: Upload image ────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, originalFileUrl: imageUrl, fileType: "image/png" }),
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setUploadId(data.id);
      setStep("choose-mask");
    },
  });

  // ─── Step 3: Create cut job ──────────────────────────────────────────────

  const cutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cut-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          upload_id: uploadId,
          mask_id: selectedMask?.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to create cut job");
      return res.json();
    },
    onSuccess: (data) => {
      setJobId(data.id);
      setStep("processing");
    },
  });

  // ─── Poll job status ─────────────────────────────────────────────────────

  const { data: jobData } = useQuery<CutJob>({
    queryKey: ["/api/cut-jobs", jobId],
    enabled: step === "processing" && jobId !== null,
    refetchInterval: (query) => {
      const jobStatus = (query.state.data as CutJob | undefined)?.jobStatus;
      return jobStatus === "completed" || jobStatus === "failed" ? false : 2000;
    },
    queryFn: async () => {
      const res = await fetch(`/api/cut-jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });

  if (jobData?.jobStatus === "completed" && step === "processing") {
    setStep("result");
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="magic-cut-flow">
      {/* Progress indicator */}
      <div className="flow-steps">
        {(["upload", "choose-mask", "processing", "result"] as Step[]).map((s, i) => (
          <div key={s} className={`flow-step ${step === s ? "active" : ""} ${i < ["upload", "choose-mask", "processing", "result"].indexOf(step) ? "done" : ""}`}>
            <span className="step-number">{i + 1}</span>
            <span className="step-label">
              {{ upload: "Upload Image", "choose-mask": "Choose Mask", processing: "Start Cut", result: "View Result" }[s]}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === "upload" && (
        <div className="step-panel">
          <h2>📤 Upload Your Image</h2>
          <p>Paste the URL of the image you want to cut into a sticker.</p>
          <input
            type="text"
            className="url-input"
            placeholder="https://example.com/image.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <button
            className="primary-btn"
            disabled={!imageUrl || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? "Uploading…" : "Next: Choose Mask →"}
          </button>
          {uploadMutation.isError && (
            <p className="error">Upload failed. Please try again.</p>
          )}
        </div>
      )}

      {/* Step 2 — Choose mask */}
      {step === "choose-mask" && (
        <div className="step-panel">
          <h2>✂️ Choose a Mask</h2>
          <CatalogPage
            userId={userId}
            onSelectMask={(mask) => {
              setSelectedMask(mask as CatalogMask);
            }}
          />
          {selectedMask && (
            <div className="selected-mask-bar">
              <span>Selected: <strong>{selectedMask.name}</strong></span>
              <button
                className="primary-btn"
                onClick={() => cutMutation.mutate()}
                disabled={cutMutation.isPending}
              >
                {cutMutation.isPending ? "Creating job…" : "Start Cut ✂️"}
              </button>
            </div>
          )}
          {cutMutation.isError && (
            <p className="error">Failed to start cut. Check your plan permissions.</p>
          )}
        </div>
      )}

      {/* Step 3 — Processing */}
      {step === "processing" && (
        <div className="step-panel center">
          <h2>⚙️ Processing Your Sticker…</h2>
          <div className="spinner" />
          <p>Status: <strong>{jobData?.jobStatus ?? "queued"}</strong></p>
          {jobData?.errorMessage && (
            <p className="error">{jobData.errorMessage}</p>
          )}
        </div>
      )}

      {/* Step 4 — Result */}
      {step === "result" && (
        <div className="step-panel center">
          <h2>🎉 Your Sticker is Ready!</h2>
          {jobData?.outputFileUrl ? (
            <>
              <img
                src={jobData.outputFileUrl}
                alt="Your sticker"
                className="sticker-result"
              />
              <a
                href={jobData.outputFileUrl}
                download="sticker.png"
                className="primary-btn download-btn"
              >
                ⬇️ Download Sticker
              </a>
            </>
          ) : (
            <p>Output not available yet.</p>
          )}
          <button
            className="secondary-btn"
            onClick={() => {
              setStep("upload");
              setImageUrl("");
              setUploadId(null);
              setSelectedMask(null);
              setJobId(null);
            }}
          >
            ✂️ Cut Another Sticker
          </button>
        </div>
      )}
    </div>
  );
}
