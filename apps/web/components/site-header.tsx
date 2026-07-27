"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";

const LINKS = [
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "Docs" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandMark />
        <nav aria-label="Primary navigation">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link aria-current={active ? "page" : undefined} href={link.href} key={link.href}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <span className="site-header__meta">React · MIT</span>
      </div>
    </header>
  );
}
