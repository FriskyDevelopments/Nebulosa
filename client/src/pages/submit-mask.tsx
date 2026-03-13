/**
 * Magic Cut — Mask Submission Page
 *
 * Lets users submit their own cut masks/templates for review.
 * Flow: Upload Mask → Add Details → Submit for Review → Await Approval
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

type Step = "upload" | "details" | "submitted";

interface SubmitFlowPageProps {
  userId: number;
}

export default function SubmitMaskPage({ userId }: SubmitFlowPageProps) {
  const [step, setStep] = useState<Step>("upload");
  const [maskFileUrl, setMaskFileUrl] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/mask-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          description: description || undefined,
          previewImageUrl: previewImageUrl || undefined,
          maskFileUrl: maskFileUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Submission failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmissionId(data.id);
      setStep("submitted");
    },
  });

  return (
    <div className="magic-cut-submit">
      {/* Progress */}
      <div className="flow-steps">
        {(["upload", "details", "submitted"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flow-step ${step === s ? "active" : ""} ${i < ["upload", "details", "submitted"].indexOf(step) ? "done" : ""}`}
          >
            <span className="step-number">{i + 1}</span>
            <span className="step-label">
              {{ upload: "Upload Mask", details: "Add Details", submitted: "Await Approval" }[s]}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === "upload" && (
        <div className="step-panel">
          <h2>📤 Upload Your Mask</h2>
          <p>Provide the URL to your mask/template file (SVG or PNG).</p>
          <label>Mask File URL</label>
          <input
            type="text"
            className="url-input"
            placeholder="https://example.com/my-mask.svg"
            value={maskFileUrl}
            onChange={(e) => setMaskFileUrl(e.target.value)}
          />
          <label>Preview Image URL (optional)</label>
          <input
            type="text"
            className="url-input"
            placeholder="https://example.com/preview.png"
            value={previewImageUrl}
            onChange={(e) => setPreviewImageUrl(e.target.value)}
          />
          <button
            className="primary-btn"
            disabled={!maskFileUrl}
            onClick={() => setStep("details")}
          >
            Next: Add Details →
          </button>
        </div>
      )}

      {/* Step 2 — Details */}
      {step === "details" && (
        <div className="step-panel">
          <h2>📝 Add Mask Details</h2>
          <label>Mask Name *</label>
          <input
            type="text"
            className="url-input"
            placeholder="e.g. Heart Outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>Description (optional)</label>
          <textarea
            className="url-input"
            placeholder="Describe your mask…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="btn-row">
            <button className="secondary-btn" onClick={() => setStep("upload")}>
              ← Back
            </button>
            <button
              className="primary-btn"
              disabled={!name || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit for Review ✅"}
            </button>
          </div>
          {submitMutation.isError && (
            <p className="error">
              {(submitMutation.error as Error)?.message ?? "Submission failed. Check your plan."}
            </p>
          )}
        </div>
      )}

      {/* Step 3 — Submitted */}
      {step === "submitted" && (
        <div className="step-panel center">
          <h2>🎉 Submission Received!</h2>
          <p>
            Your mask <strong>"{name}"</strong> has been submitted for review.
            {submissionId && <span> (ID: {submissionId})</span>}
          </p>
          <p>Our team will review it and notify you of the outcome.</p>
          <button
            className="secondary-btn"
            onClick={() => {
              setStep("upload");
              setMaskFileUrl("");
              setPreviewImageUrl("");
              setName("");
              setDescription("");
              setSubmissionId(null);
            }}
          >
            Submit Another Mask
          </button>
        </div>
      )}
    </div>
  );
}
