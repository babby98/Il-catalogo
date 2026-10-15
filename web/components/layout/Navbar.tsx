"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "Archive" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass flex w-full max-w-[1400px] items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid size-8 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent via-fuchsia-500 to-teal-400">
            <span className="size-3 rounded-full bg-ink-950 ring-[5px] ring-ink-950/30 transition-transform duration-500 group-hover:rotate-180 group-hover:scale-110" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Il Catalogo
            <span className="ml-2 hidden font-mono text-[10px] font-normal text-zinc-500 sm:inline">v0.2</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    "block rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200",
                    active ? "bg-white/10 text-white shadow-inner" : "text-zinc-400 hover:text-white",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

