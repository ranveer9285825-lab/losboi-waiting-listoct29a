"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  REPORT_CATEGORIES,
  DESCRIPTION_MAX_LENGTH,
  OTHER_MIN_DESCRIPTION_LENGTH,
  type ReportCategoryId,
} from "./reportConfig";
import { submitReport } from "./submitReport";

type Props = {
  open: boolean;
  onClose: () => void;
  postId: string;
  userId: string | null;
  dark?: boolean;
  onToast?: (message: string) => void;
};

export default function ReportSheet({ open, onClose, postId, userId, dark = false, onToast }: Props) {
  const [category, setCategory] = useState<ReportCategoryId | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Start fresh every time the sheet opens
  useEffect(() => {
    if (open) {
      setCategory(null);
      setDescription("");
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!userId) return setError("Please log in to report a story.");
    if (!category) return setError("Please select a reason.");
    if (category === "other" && description.trim().length < OTHER_MIN_DESCRIPTION_LENGTH) {
      return setError(`Please describe the problem (at least ${OTHER_MIN_DESCRIPTION_LENGTH} characters).`);
    }

    setError(null);
    setSubmitting(true);
    const result = await submitReport({ postId, userId, category, description });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    onToast?.("Report submitted");
  };

  const sheet = dark ? "bg-[#1a1a1a] text-white" : "bg-white text-gray-900";
  const muted = dark ? "text-gray-400" : "text-gray-500";

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div
        role="dialog"
        aria-label="Report story"
        className={`absolute bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 max-h-[90vh] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } ${sheet}`}
        style={{ borderRadius: "24px 24px 0 0" }}
      >
        {done ? (
          <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <Check size={28} />
            </div>
            <h2 className="text-lg font-semibold mb-1">Report submitted</h2>
            <p className={`text-sm mb-6 ${muted}`}>
              Thanks for helping keep Losboi safe. Our team will review this story.
            </p>
            <button onClick={onClose} className="w-full py-3 rounded-full bg-gray-900 text-white text-sm font-semibold active:scale-[0.99] transition">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Report this story</h2>
                <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full flex items-center justify-center text-lg">
                  ✕
                </button>
              </div>
              <p className={`text-sm mt-1 ${muted}`}>Select the reason that best describes the problem.</p>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-3 space-y-2">
              {REPORT_CATEGORIES.map((c) => {
                const selected = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategory(c.id);
                      setError(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-start gap-3 ${
                      selected
                        ? dark
                        ? "border-rose-500 bg-rose-500/10"
                        : "border-rose-500 bg-rose-50"
                        : dark
                        ? "border-[#333]"
                        : "border-gray-200"
                    }`}
                  >
                    <span
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        selected ? "border-rose-500" : dark ? "border-gray-500" : "border-gray-300"
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-semibold ${selected && !dark ? "text-rose-700" : ""}`}>{c.label}</span>
                      <span className={`block text-xs mt-0.5 ${muted}`}>{c.description}</span>
                    </span>
                  </button>
                );
              })}

              <div className="pt-1">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  placeholder={category === "other" ? "Describe the problem (required)" : "Add details to help our team (optional)"}
                  className={`w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none ${
                    dark ? "bg-[#121212] border-[#444] text-white" : "bg-gray-100 border-transparent text-gray-900"
                  }`}
                />
                <p className={`text-[11px] text-right mt-1 ${muted}`}>
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            </div>

            <div className={`px-5 pt-3 pb-6 border-t ${dark ? "border-[#333]" : "border-gray-100"}`}>
              {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting || !category}
                className="w-full py-3 rounded-full bg-rose-600 text-white text-sm font-semibold active:scale-[0.99] transition disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
