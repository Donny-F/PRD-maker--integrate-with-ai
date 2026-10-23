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
    <section className="work-panel" aria-label="Dokumen PRD">
      <div className="work-panel__head">
        <div className="work-panel__title">
          <FileText />
          <span>Dokumen PRD</span>
          {isStreaming && <span className="stream-dot">Streaming</span>}
        </div>

        <div className="btn-row">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isStreaming || !canRegenerate}
              title="Generate ulang dokumen PRD dari prompt awal dan jawaban klarifikasi"
              className="btn btn--quiet btn--sm"
            >
              <RefreshCw className={isStreaming ? "animate-spin" : ""} />
              <span>{isStreaming ? "Memproses" : content ? "Regenerate" : "Generate"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!content}
            className="btn btn--quiet btn--sm"
          >
            {copied ? <Check /> : <Copy />}
            <span>{copied ? "Tersalin" : "Salin"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMd}
            disabled={!content || isStreaming}
            className="btn btn--primary btn--sm"
          >
            <Download />
            <span>Unduh .md</span>
          </button>
        </div>
      </div>

      <div className="prd-scroll">
        {content ? (
          <div className="prd-doc">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="prd-empty">
            <h3>{isStreaming ? "Menyusun dokumen" : "Dokumen belum dibuat"}</h3>
            <p>
              {isStreaming
                ? "AI sedang menulis PRD dari prompt awal dan jawaban klarifikasi proyek ini. Teks akan muncul saat stream berjalan."
                : "Dokumen PRD dapat dibuat langsung dari prompt awal dan jawaban klarifikasi proyek ini."}
            </p>
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isStreaming || !canRegenerate}
                className="btn btn--primary btn--sm"
              >
                <RefreshCw className={isStreaming ? "animate-spin" : ""} />
                <span>{isStreaming ? "Memproses..." : "Generate PRD"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
