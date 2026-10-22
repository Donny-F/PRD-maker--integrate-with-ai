import React from "react";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Shell for the working app (projects, admin, login).
 *
 * The root layout only owns `<html>`/`<body>` and the providers, so each route
 * group supplies its own top-level chrome. Everything in this group keeps the
 * sticky global navbar and the constrained, padded column the app was built
 * around; the marketing landing page draws its own full-bleed frame instead and
 * therefore lives in the sibling `(marketing)` group.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </>
  );
}
