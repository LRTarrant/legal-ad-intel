"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Bike, Truck, Ship, ChevronDown, ChevronRight } from "lucide-react";

const personalInjuryPaths = [
  "/fatalities",
  "/motorcycle-fatalities",
  "/large-truck-fatalities",
  "/boating-accidents",
];

const personalInjuryItems = [
  { label: "Motor Vehicle Fatalities", href: "/fatalities", Icon: Car },
  { label: "Motorcycle Fatalities", href: "/motorcycle-fatalities", Icon: Bike },
  { label: "Large Truck Fatalities", href: "/large-truck-fatalities", Icon: Truck },
  { label: "Boating Accidents", href: "/boating-accidents", Icon: Ship },
];

const topNavItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Markets", href: "/markets" },
];

const bottomNavItems = [
  { label: "Judicial Profiles", href: "/judicial-profiles" },
  { label: "PI Viability", href: "/pi-viability" },
  { label: "MDL Tracker", href: "/mdl-tracker" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isChildActive = personalInjuryPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const [groupManuallyToggled, setGroupManuallyToggled] = useState(false);
  const [groupUserOpen, setGroupUserOpen] = useState(true);

  // Group is open if a child is active OR if the user hasn't manually closed it
  const groupOpen = isChildActive || (groupManuallyToggled ? groupUserOpen : true);

  function toggleGroup() {
    setGroupManuallyToggled(true);
    setGroupUserOpen(!groupOpen);
  }

  const closeSidebar = () => setIsOpen(false);

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
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

  function renderNavLink(item: { label: string; href: string }) {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "border-l-[3px] border-intelligence-teal bg-white/8"
            : "border-l-[3px] border-transparent hover:bg-white/5"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {/* Hamburger button — mobile only */}
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

      {/* Backdrop — mobile only, when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-midnight-navy text-white flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shrink-0
        `}
      >
        {/* Close button — mobile only, inside sidebar */}
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

        <nav className="flex-1 flex flex-col gap-1 px-3">
          {topNavItems.map((item) => renderNavLink(item))}

          {/* Personal Injury group */}
          <div>
            <button
              type="button"
              onClick={toggleGroup}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] border-transparent hover:bg-white/5"
            >
              <span>Personal Injury</span>
              {groupOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-white/50" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-white/50" />
              )}
            </button>

            {groupOpen && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {personalInjuryItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-2 pl-8 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? "bg-white/10 text-white border-l-2 border-intelligence-teal"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {bottomNavItems.map((item) => renderNavLink(item))}
        </nav>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-gray">Legal Marketing Intelligence</p>
        </div>
      </aside>
    </>
  );
}
