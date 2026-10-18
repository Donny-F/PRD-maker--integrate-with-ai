"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import {
  AlertTriangle,
  FileCode,
  GitBranch,
  Globe,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const oauthErrors: Record<string, string> = {
  OAuthSignin: "Gagal memulai login OAuth. Coba lagi.",
  OAuthCallback: "Provider OAuth menolak proses masuk. Coba lagi.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode lain.",
  AccessDenied: "Akses ditolak oleh provider OAuth.",
  Configuration: "Konfigurasi OAuth belum lengkap di server.",
};

type OAuthProvider = {
  id: string;
  name: string;
};

export default function LoginPage() {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getProviders()
      .then((result) => {
        if (!active) return;
        setProviders(
          Object.values(result || {})
            .filter((provider) => provider.id !== "credentials")
            .map((provider) => ({ id: provider.id, name: provider.name }))
        );
      })
      .catch(() => {
        if (active) setProviders([]);
      });

    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError) {
      setError(oauthErrors[oauthError] || "Login OAuth gagal. Coba lagi.");
    }

    return () => {
      active = false;
    };
  }, []);

  const handleOAuth = async (providerId: string) => {
    setOauthLoading(providerId);
    setError(null);

    const rawCallback = new URLSearchParams(window.location.search).get("callbackUrl");
    const callbackUrl =
      rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : "/projects";

    try {
      await signIn(providerId, { callbackUrl });
    } catch {
      setError("Gagal memulai login OAuth. Coba lagi.");
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-4">
      <div className="w-full max-w-5xl lg:min-h-[580px] grid lg:grid-cols-[1.05fr_1fr] rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-neutral-900/5 dark:shadow-black/20 bg-white dark:bg-neutral-900">
        {/* Brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-neutral-950 text-neutral-100 overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-brand/10 blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-brand" />
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-tight">
                  PRD <span className="text-brand">Maker</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 -mt-0.5">
                  AI Architect
                </div>
              </div>
            </div>

            <h2 className="mt-12 text-3xl font-extrabold leading-tight tracking-tight">
              Dari ide menjadi
              <br />
              <span className="text-brand">PRD siap eksekusi.</span>
            </h2>
            <p className="mt-4 text-sm text-neutral-400 leading-relaxed max-w-xs">
              Susun Product Requirements Document terstruktur, diagram alur, dan riwayat versi dalam
              satu tempat.
            </p>

            <ul className="mt-10 space-y-4 text-sm text-neutral-300">
              <li className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-brand shrink-0" />
                Klarifikasi otomatis dengan LLM pilihan Anda
              </li>
              <li className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-brand shrink-0" />
                Diagram arsitektur dari setiap versi PRD
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                Login aman lewat penyedia OAuth pilihan Anda
              </li>
            </ul>
          </div>

          <p className="relative text-[11px] text-neutral-500">
            © {new Date().getFullYear()} PRD Maker. Semua data proyek tetap milik Anda.
          </p>
        </div>

        {/* Form panel */}
        <div className="p-6 sm:p-10">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-brand" />
            </div>
            <div className="font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              PRD <span className="text-brand-dark dark:text-brand">Maker</span>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Masuk ke akun Anda
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Gunakan akun OAuth pilihan Anda. Akun baru dibuat otomatis saat pertama kali masuk.
          </p>

          {error && (
            <div className="mt-5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="mt-6">
            {providers === null ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500 dark:text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat metode login...
              </div>
            ) : providers.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">Belum ada provider OAuth tersedia.</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Hubungi administrator untuk mengaktifkan Google atau GitHub.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {providers.map((provider) => {
                  const isGithub = provider.id === "github";
                  const isBusy = oauthLoading === provider.id;

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleOAuth(provider.id)}
                      disabled={oauthLoading !== null}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isGithub ? (
                        <GitBranch className="w-4 h-4" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      {isBusy ? `Menghubungkan ke ${provider.name}...` : `Lanjutkan dengan ${provider.name}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
