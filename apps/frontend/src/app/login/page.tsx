"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileCode, Shield, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDevLogin = async (targetEmail: string, targetRole: "ADMIN" | "USER", targetName: string) => {
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email: targetEmail,
      role: targetRole,
      name: targetName,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Login gagal. Pastikan backend server aktif di port 5000.");
    } else {
      router.push("/projects");
      router.refresh();
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await handleDevLogin(email, role, name || (role === "ADMIN" ? "Admin User" : "Dev User"));
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-8">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-brand font-bold shadow-md mb-3">
            <FileCode className="w-7 h-7 text-brand" />
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            PRD <span className="text-brand-dark">Maker</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Masuk untuk membuat PRD terstruktur dan bagan diagram otomatis.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Quick Dev Presets */}
        <div className="space-y-3 mb-6">
          <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Akses Cepat (Dev Mode)
          </label>

          <button
            type="button"
            onClick={() => handleDevLogin("4kungm4il.15243@gmail.com", "ADMIN", "Super Admin")}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 text-neutral-900 font-medium text-xs transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-neutral-950">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-neutral-900">Masuk sebagai Admin</div>
                <div className="text-[10px] text-neutral-500">4kungm4il.15243@gmail.com (Role: ADMIN)</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => handleDevLogin("demo@user.local", "USER", "Demo Developer")}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-medium text-xs transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-bold text-neutral-900">Masuk sebagai User Biasa</div>
                <div className="text-[10px] text-neutral-500">demo@user.local (Role: USER)</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-semibold">
            <span className="bg-white px-3 text-neutral-400">Atau Masuk dengan Email Lain</span>
          </div>
        </div>

        {/* Custom Form */}
        <form onSubmit={handleCustomLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              required
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budi Santoso"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Peran (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              <option value="USER">User (Standard)</option>
              <option value="ADMIN">Admin (Full Control)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full mt-2 py-2.5 px-4 bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk ke Aplikasi"}
          </button>
        </form>
      </div>
    </div>
  );
}
