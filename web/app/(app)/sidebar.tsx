"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Building2,
  Car,
  Gavel,
  HardHat,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Radio,
  Sliders,
  Truck,
  Bike,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/overview", Icon: LayoutDashboard },
  { label: "Markets", href: "/markets", Icon: MapPin },
  { label: "Torts", href: "/torts", Icon: Radio },
  { label: "Competitors", href: "/competitors", Icon: Building2 },
  { label: "Planner", href: "/planner", Icon: Sliders },
];

type NavItem = {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const dataModules: NavGroup[] = [
  {
    heading: "Accident Intelligence",
    items: [
      { label: "Motor Vehicle", href: "/fatalities", Icon: Car },
      { label: "Large Truck", href: "/large-truck-fatalities", Icon: Truck },
      { label: "Motorcycle", href: "/motorcycle-fatalities", Icon: Bike },
      { label: "Boating", href: "/boating-accidents", Icon: Anchor },
      { label: "Construction / Job Site", href: "/construction", Icon: HardHat },
    ],
  },
  {
    heading: "Exposure & Health Signals",
    items: [
      { label: "Cancer Incidents", href: "/cancer-incidence", Icon: HeartPulse },
    ],
  },
  {
    heading: "Litigation Intelligence",
    items: [
      { label: "MDL Tracker", href: "/mdl-tracker", Icon: Gavel },
    ],
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setIsOpen(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function renderNavLink(item: NavItem) {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        <item.Icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden rounded p-2 bg-midnight-navy text-white"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect y="3" width="20" height="2" rx="1" />
          <rect y="9" width="20" height="2" rx="1" />
          <rect y="15" width="20" height="2" rx="1" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-midnight-navy text-white flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shrink-0
        `}
      >
        <button
          className="md:hidden absolute top-4 right-4 text-white/70 hover:text-white"
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 4l12 12M16 4L4 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="flex items-center justify-center px-4 pt-6 pb-8">
          <Image
            src="/logo-horizontal-white.svg"
            alt="Legal Marketing Intelligence"
            width={220}
            height={52}
            priority
            className="w-52 h-auto"
          />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto no-scrollbar">
          {navItems.map((item) => renderNavLink(item))}

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Data Modules
            </p>
            {dataModules.map((group) => (
              <div key={group.heading} className="mb-3">
                <p className="px-3 pb-1 text-[11px] font-medium text-white/50">
                  {group.heading}
                </p>
                <div className="flex flex-col gap-0.5 pl-2">
                  {group.items.map((item) => renderNavLink(item))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-gray">Legal Marketing Intelligence</p>
        </div>
      </aside>
    </>
  );
}
