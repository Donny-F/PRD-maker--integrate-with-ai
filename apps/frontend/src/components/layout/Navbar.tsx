"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { FileCode, LayoutDashboard, PlusCircle, ShieldAlert, LogOut, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:ring-1 dark:ring-neutral-700 flex items-center justify-center text-brand font-bold shadow-sm group-hover:scale-105 transition-transform">
              <FileCode className="w-5 h-5 text-brand" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-neutral-900 dark:text-neutral-100">
                PRD <span className="text-brand-dark dark:text-brand">Maker</span>
              </span>
              <span className="block text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest -mt-1">
                AI Architect MVP
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {session && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <Link
                href="/projects"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  pathname === "/projects"
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Daftar Proyek
              </Link>

              <Link
                href="/projects/new"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  pathname === "/projects/new"
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-brand-dark dark:text-brand" />
                Buat PRD Baru
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    pathname === "/admin"
                      ? "bg-brand/20 text-brand-dark dark:text-brand font-semibold border border-brand/40"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-dark dark:text-brand" />
                  Panel Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Session Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-none">
                    {session.user.name || session.user.email}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isAdmin
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : "hidden bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      {session.user.role}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{session.user.email}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Keluar"
                className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
              // LOGIN BUTTON
              <Link
                hidden={pathname == "/login"}
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-neutral-950 transition shadow-sm"
              >
                Masuk / Login
              </Link>
            )
          }
        </div>
      </div>
    </header>
  );
}
