"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/live", label: "Live" },
  { href: "/clean", label: "Clean" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-40">
      <nav className="mx-auto max-w-6xl h-14 px-6 flex items-center justify-between">
        <Link href="/" className="font-display font-bold tracking-[0.3em] text-text">
          VEILZERO
        </Link>
        <ul className="flex items-center gap-6 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={
                  pathname === l.href
                    ? "text-primary"
                    : "text-text-muted hover:text-text transition-colors"
                }
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
