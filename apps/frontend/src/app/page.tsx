import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Zap, GitBranch, Layers } from "lucide-react";

export default function HomePage() {
  return (
    <div className="py-12 md:py-20 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 border border-brand/30 text-brand-dark text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>PRD Generator & Visual Flow Architect MVP</span>
      </div>

      {/* Main Hero Header */}
      <h1 className="text-4xl md:text-6xl font-black text-neutral-900 tracking-tight max-w-4xl leading-tight">
        Ubah Ide Produk Menjadi <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-neutral-950 via-neutral-800 to-brand-dark bg-clip-text text-transparent">
          Dokumen PRD & Bagan Diagram Alur
        </span>
      </h1>

      <p className="mt-5 text-sm md:text-base text-neutral-600 max-w-2xl leading-relaxed">
        Manfaatkan kekuatan Antigravity Flash & DeepSeek untuk klarifikasi kebutuhan fungsional,
        streaming markdown PRD instan, dan kalkulasi otomatis bagan diagram alur hirarki kiri-ke-kanan.
      </p>

      {/* Hero CTA Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-sm shadow-md transition transform hover:-translate-y-0.5"
        >
          <span>Mulai Buat PRD Sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm transition"
        >
          <span>Lihat Riwayat Proyek</span>
        </Link>
      </div>

      {/* 4 Feature Highlights Grid */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl text-left">
        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark flex items-center justify-center mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1.5">
            Streaming PRD Real-Time (SSE)
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Tidak perlu menunggu response lama. Dokumen PRD terstruktur di-stream secara bertahap langsung ke markdown preview.
          </p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark flex items-center justify-center mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1.5">
            Diagram Alur Otomatis (Dagre + React Flow)
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Hirarki Epic, Fitur dengan indikator fase, dan Sub-fitur diatur secara otomatis dalam layout kiri-ke-kanan dan siap diunduh dalam format PNG.
          </p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark flex items-center justify-center mb-4">
            <GitBranch className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1.5">
            Versioning & Linear Rollback
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Iterasi revisi tersimpan sebagai versi baru (v1, v2, v3). Rollback ke versi terdahulu tetap menjaga riwayat linear tanpa menghapus data.
          </p>
        </div>
      </div>
    </div>
  );
}
