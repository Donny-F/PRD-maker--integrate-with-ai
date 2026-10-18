"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Copy, Check, FileText } from "lucide-react";

interface PrdViewerProps {
  content: string;
  projectTitle?: string;
  isStreaming?: boolean;
}

export function PrdViewer({
  content,
  projectTitle = "project-prd",
  isStreaming = false,
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
    <div className="flex flex-col h-full bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
      {/* Top Header & Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50/90 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-dark" />
          <span className="text-xs font-semibold text-neutral-800">Dokumen PRD (Markdown)</span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/20 text-brand-dark animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              Streaming output...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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
      <div className="p-6 overflow-y-auto max-h-[600px] text-neutral-800 font-sans text-sm leading-relaxed prose prose-neutral max-w-none prose-headings:font-semibold prose-headings:text-neutral-900 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-table:border prose-th:bg-neutral-100 prose-th:p-2 prose-td:p-2">
        {content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <div className="py-12 text-center text-xs text-neutral-400">
            Dokumen PRD belum dibuat. Mulai dari Step 1 untuk mengalirkan dokumen.
          </div>
        )}
      </div>
    </div>
  );
}
