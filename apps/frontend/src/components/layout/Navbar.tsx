"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, PlusCircle, ShieldAlert, LogOut } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/**
 * One link list, used by the desktop bar and the scrollable mobile row.
 *
 * Keeping the markup in a component rather than a render helper means both
 * breakpoints cannot drift apart while the active-route rule stays in one place.
 */
function NavLinks({
  items,
  pathname,
  mobile = false,
}: {
  items: NavItem[];
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <nav
      className={mobile ? "app-nav__mobile" : "app-nav__links"}
      aria-label={mobile ? "Navigasi utama seluler" : "Navigasi utama"}
    >
      {items.map((item) => {
        const active =
          item.href === "/projects"
            ? pathname === "/projects"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="app-nav__link"
            data-active={active ? "true" : "false"}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shell navigation for the working app.
 *
 * It mirrors the landing page's plain header: a wordmark, a short row of text
 * links and one dark session action. The mobile version repeats the same links
 * in a horizontally scrollable row, so no navigation job depends on a hidden
 * hamburger.
 */
export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user?.role === "ADMIN";
  const items: NavItem[] = [
    { href: "/projects", label: "Proyek", icon: <LayoutDashboard /> },
    { href: "/projects/new", label: "Buat PRD", icon: <PlusCircle /> },
    ...(isAdmin
      ? [{ href: "/admin", label: "Admin", icon: <ShieldAlert /> }]
      : []),
  ];

  const displayName = session?.user?.name || session?.user?.email || "Akun";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="app-nav">
      <div className="app-nav__inner">
        <div className="app-nav__bar">
          <Link href="/" className="app-nav__brand" aria-label="PRD Maker, ke beranda">
            <BrandMark
              className="h-9 w-9 rounded-[10px]"
              iconClassName="h-[18px] w-[18px]"
            />
            <span className="app-nav__wordmark">
              PRD Maker
            </span>
          </Link>

          {session ? <NavLinks items={items} pathname={pathname} /> : null}

          <div className="app-nav__actions">
            <ThemeToggle />
            {session ? (
              <>
                <div className="app-nav__user">
                  <span className="app-nav__avatar" aria-hidden>
                    {initial}
                  </span>
                  <span className="app-nav__identity">
                    <span className="app-nav__name">{displayName}</span>
                    <span className="app-nav__role">
                      {isAdmin ? "Admin" : "Anggota"}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Keluar"
                  aria-label="Keluar"
                  className="btn btn--quiet btn--icon"
                >
                  <LogOut />
                </button>
              </>
            ) : (
              pathname !== "/login" && (
                <Link href="/login" className="btn btn--primary btn--sm">
                  Masuk
                </Link>
              )
            )}
          </div>
        </div>
        {session ? <NavLinks items={items} pathname={pathname} mobile /> : null}
      </div>
    </header>
  );
}
