"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export function HeroStartButton() {
  const { status } = useSession();
  const href = status === "authenticated" ? "/projects" : "/login";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-neutral-950 font-bold text-sm shadow-md transition transform hover:-translate-y-0.5"
    >
      <span>Mulai Buat PRD Sekarang</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
