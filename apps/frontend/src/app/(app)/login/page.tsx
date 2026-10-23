"use client";

import { useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { AlertTriangle, GitBranch, Globe, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

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
    <div className="login-shell">
      <div className="login-panel">
        <section className="login-story" aria-labelledby="login-story-title">
          <div className="login-story__brand">
            <BrandMark className="h-10 w-10 rounded-[12px]" iconClassName="h-5 w-5" />
            <span>PRD Maker</span>
          </div>

          <div>
            <h1 id="login-story-title" className="login-story__title">
              Dari ide menjadi <span>PRD siap eksekusi.</span>
            </h1>
            <p className="login-story__text">
              Satu prompt menghasilkan dokumen terstruktur, diagram alur, dan
              riwayat versi yang bisa dibuka kembali kapan saja.
            </p>

            <div className="login-flow" aria-label="Alur produk">
              <span className="login-flow__step login-flow__step--accent">Prompt</span>
              <span className="flow__arrow" aria-hidden>
                →
              </span>
              <span className="login-flow__step">PRD</span>
              <span className="flow__arrow" aria-hidden>
                →
              </span>
              <span className="login-flow__step">Diagram</span>
            </div>
          </div>

          <p className="login-story__legal">
            © {new Date().getFullYear()} PRD Maker. Data proyek tetap milik Anda.
          </p>
        </section>

        <section className="login-form" aria-labelledby="login-title">
          <h2 id="login-title" className="login-form__title">
            Masuk ke ruang kerja
          </h2>
          <p className="login-form__sub">
            Gunakan akun OAuth pilihan Anda. Akun baru dibuat otomatis saat pertama
            kali masuk.
          </p>

          {error && (
            <div className="notice notice--danger" style={{ marginTop: 20 }}>
              <AlertTriangle />
              <span>{error}</span>
            </div>
          )}

          <div className="provider-list">
            {providers === null ? (
              <div className="app-loading" style={{ minHeight: 160 }}>
                <Loader2 className="animate-spin" />
                <span>Memuat metode login...</span>
              </div>
            ) : providers.length === 0 ? (
              <div className="notice notice--warning">
                <AlertTriangle />
                <span>
                  Belum ada provider OAuth tersedia. Hubungi administrator untuk
                  mengaktifkan Google atau GitHub.
                </span>
              </div>
            ) : (
              providers.map((provider) => {
                const isGithub = provider.id === "github";
                const isBusy = oauthLoading === provider.id;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleOAuth(provider.id)}
                    disabled={oauthLoading !== null}
                    className="provider-button"
                  >
                    {isBusy ? (
                      <Loader2 className="animate-spin" />
                    ) : isGithub ? (
                      <GitBranch />
                    ) : (
                      <Globe />
                    )}
                    <span>
                      {isBusy
                        ? `Menghubungkan ke ${provider.name}...`
                        : `Lanjutkan dengan ${provider.name}`}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <p className="login-form__foot">
            Dengan masuk, Anda menyetujui penggunaan akun OAuth untuk mengakses
            proyek yang tersimpan di workspace ini.
          </p>
        </section>
      </div>
    </div>
  );
}
