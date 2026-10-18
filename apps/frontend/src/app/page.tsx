import Link from "next/link";
import { Sparkles, ShieldCheck, Zap, GitBranch, Layers } from "lucide-react";
import { HeroStartButton } from "@/components/home/HeroStartButton";

export default function HomePage() {
  return (
    <div className="py-12 md:py-20 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 border border-brand/30 text-brand-dark dark:text-brand text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>PRD Generator & Visual Flow Architect MVP</span>
      </div>

      {/* Main Hero Header */}
      <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight max-w-4xl leading-tight">
        Ubah Ide Produk Menjadi <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-neutral-950 via-neutral-800 to-brand-dark dark:from-neutral-100 dark:via-neutral-300 dark:to-brand bg-clip-text text-transparent">
          Dokumen PRD & Bagan Diagram Alur
        </span>
      </h1>

      <p className="mt-5 text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
        Manfaatkan kekuatan Antigravity Flash & DeepSeek untuk klarifikasi kebutuhan fungsional,
        streaming markdown PRD instan, dan kalkulasi otomatis bagan diagram alur hirarki kiri-ke-kanan.
      </p>

      {/* Hero CTA Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <HeroStartButton />
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold text-sm transition"
        >
          <span>Lihat Riwayat Proyek</span>
        </Link>
      </div>

      {/* 4 Feature Highlights Grid */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl text-left">
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark dark:text-brand flex items-center justify-center mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
            Streaming PRD Real-Time (SSE)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Tidak perlu menunggu response lama. Dokumen PRD terstruktur di-stream secara bertahap langsung ke markdown preview.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark dark:text-brand flex items-center justify-center mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
            Diagram Alur Otomatis (Dagre + React Flow)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Hirarki Epic, Fitur dengan indikator fase, dan Sub-fitur diatur secara otomatis dalam layout kiri-ke-kanan dan siap diunduh dalam format PNG.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand-dark dark:text-brand flex items-center justify-center mb-4">
            <GitBranch className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
            Versioning & Linear Rollback
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Iterasi revisi tersimpan sebagai versi baru (v1, v2, v3). Rollback ke versi terdahulu tetap menjaga riwayat linear tanpa menghapus data.
          </p>
        </div>
      </div>
    </div>
  );
}
