"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Markets", href: "/markets" },
  { label: "Fatalities", href: "/fatalities" },
  { label: "Judicial Profiles", href: "/judicial-profiles" },
  { label: "MDL Tracker", href: "/mdl-tracker" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col bg-midnight-navy text-white shrink-0">
      <div className="px-5 pt-6 pb-8">
        <Image
          src="/logo-horizontal.svg"
          alt="Legal Marketing Intelligence"
          width={200}
          height={48}
          priority
          className="max-w-[200px] h-auto"
        />
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-l-[3px] border-intelligence-teal bg-white/8"
                  : "border-l-[3px] border-transparent hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4">
        <p className="text-xs text-slate-gray">Legal Marketing Intelligence</p>
      </div>
    </aside>
  );
}
