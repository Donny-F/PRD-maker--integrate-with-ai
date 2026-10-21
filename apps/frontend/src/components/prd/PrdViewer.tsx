"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Copy, Check, FileText, RefreshCw } from "lucide-react";

interface PrdViewerProps {
  content: string;
  projectTitle?: string;
  isStreaming?: boolean;
  /**
   * Rebuilds the PRD from the project's initial prompt and clarifications.
   * The backend keeps the previous draft as history and stores the result as
   * the next version, so this action is non-destructive.
   */
  onRegenerate?: () => void;
  /** False while another AI operation (revision, diagram) must not be interrupted. */
  canRegenerate?: boolean;
}

export function PrdViewer({
  content,
  projectTitle = "project-prd",
  isStreaming = false,
  onRegenerate,
  canRegenerate = true,
}: PrdViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.download = `${safeTitle}.md`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-neutral-50/90 dark:bg-neutral-900/90 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-dark dark:text-brand" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Dokumen PRD (Markdown)</span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/20 text-brand-dark dark:text-brand animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              Streaming output...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isStreaming || !canRegenerate}
              title="Generate ulang dokumen PRD dari prompt awal dan jawaban klarifikasi"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-dark dark:text-brand border border-brand/40 hover:bg-brand/10 rounded-md transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isStreaming ? "animate-spin" : ""}`} />
              <span>{isStreaming ? "Memproses..." : content ? "Regenerate" : "Generate"}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Tersalin" : "Salin"}</span>
          </button>

          <button
            onClick={handleDownloadMd}
            disabled={!content || isStreaming}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-neutral-950 bg-brand hover:bg-brand-hover rounded-md shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh project-prd.md</span>
          </button>
        </div>
      </div>

      {/* Markdown Content Area */}
      <div className="p-6 overflow-y-auto max-h-[600px] font-sans text-sm leading-relaxed prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-table:border prose-table:border-neutral-200 dark:prose-table:border-neutral-700 prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-neutral-200 dark:prose-td:border-neutral-800">
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-brand/10 text-brand-dark dark:text-brand">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                {isStreaming ? "Menyusun Dokumen PRD" : "Dokumen PRD Belum Dibuat"}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                {isStreaming
                  ? "AI sedang menyusun dokumen PRD dari prompt awal dan jawaban klarifikasi proyek ini."
                  : "Dokumen PRD dapat digenerate langsung dari prompt awal dan jawaban klarifikasi proyek ini."}
              </p>
            </div>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isStreaming || !canRegenerate}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-neutral-950 bg-brand hover:bg-brand-hover rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStreaming ? "animate-spin" : ""}`} />
                <span>{isStreaming ? "Memproses..." : "Generate PRD Sekarang"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
