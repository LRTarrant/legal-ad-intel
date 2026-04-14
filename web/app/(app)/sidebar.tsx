"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  CloudLightning,
  Film,
  HardHat,
  HeartPulse,
  Radio,
  Search,
  Ship,
  Target,
  Truck,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";

const personalInjuryPaths = [
  "/fatalities",
  "/motorcycle-fatalities",
  "/large-truck-fatalities",
  "/boating-accidents",
  "/construction",
];

const personalInjuryItems = [
  { label: "Motor Vehicle Fatalities", href: "/fatalities", Icon: Car },
  { label: "Motorcycle Fatalities", href: "/motorcycle-fatalities", Icon: Bike },
  { label: "Large Truck Fatalities", href: "/large-truck-fatalities", Icon: Truck },
  { label: "Boating Accidents", href: "/boating-accidents", Icon: Ship },
  { label: "Construction", href: "/construction", Icon: HardHat },
];

const propertyDamagePaths = ["/storm-events"];

const propertyDamageItems = [
  { label: "Storm Events", href: "/storm-events", Icon: CloudLightning },
];

const massTortPaths = ["/cancer-incidence", "/mdl-tracker"];

const massTortItems = [
  { label: "Cancer Incidence", href: "/cancer-incidence", Icon: HeartPulse },
  { label: "MDL Tracker", href: "/mdl-tracker" },
];

const topNavItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Markets", href: "/markets" },
  { label: "Opportunity", href: "/opportunity", Icon: Target },
];

const advertisingPaths = [
  "/advertising/channel-planner",
  "/advertising/advertisers",
  "/advertising/creatives",
  "/advertising/saturation",
  "/advertising/search-visibility",
  "/advertising/trends",
];

const advertisingItems = [
  { label: "Channel Planner", href: "/advertising/channel-planner", Icon: BarChart3 },
  { label: "Advertiser Profiles", href: "/advertising/advertisers", Icon: Building2 },
  { label: "Creative Gallery", href: "/advertising/creatives", Icon: Film },
  { label: "Ad Saturation", href: "/advertising/saturation", Icon: Radio },
  { label: "Search Visibility", href: "/advertising/search-visibility", Icon: Search },
  { label: "Google Trends", href: "/advertising/trends", Icon: TrendingUp },
];

const bottomNavItems = [
  { label: "Judicial Profiles", href: "/judicial-profiles" },
  { label: "PI Viability", href: "/pi-viability" },
  { label: "Market Demographics", href: "/market-demographics", Icon: Users },
];

type NavItem = {
  label: string;
  href: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isChildActive = personalInjuryPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isPdChildActive = propertyDamagePaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isMassTortChildActive = massTortPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const [groupManuallyToggled, setGroupManuallyToggled] = useState(false);
  const [groupUserOpen, setGroupUserOpen] = useState(true);
  const [pdGroupManuallyToggled, setPdGroupManuallyToggled] = useState(false);
  const [pdGroupUserOpen, setPdGroupUserOpen] = useState(true);
  const [massTortManuallyToggled, setMassTortManuallyToggled] = useState(false);
  const [massTortUserOpen, setMassTortUserOpen] = useState(true);
  const [adManuallyToggled, setAdManuallyToggled] = useState(false);
  const [adUserOpen, setAdUserOpen] = useState(true);

  const groupOpen = isChildActive || (groupManuallyToggled ? groupUserOpen : true);
  const pdGroupOpen =
    isPdChildActive || (pdGroupManuallyToggled ? pdGroupUserOpen : true);
  const massTortOpen =
    isMassTortChildActive ||
    (massTortManuallyToggled ? massTortUserOpen : true);

  const isAdChildActive = advertisingPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const adGroupOpen =
    isAdChildActive || (adManuallyToggled ? adUserOpen : true);

  function toggleGroup() {
    setGroupManuallyToggled(true);
    setGroupUserOpen(!groupOpen);
  }

  function togglePdGroup() {
    setPdGroupManuallyToggled(true);
    setPdGroupUserOpen(!pdGroupOpen);
  }

  function toggleMassTortGroup() {
    setMassTortManuallyToggled(true);
    setMassTortUserOpen(!massTortOpen);
  }

  function toggleAdGroup() {
    setAdManuallyToggled(true);
    setAdUserOpen(!adGroupOpen);
  }

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
        className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-white/10 text-white"
            : "hover:bg-white/5"
        }`}
      >
        {item.Icon ? <item.Icon className="w-4 h-4 shrink-0" /> : null}
        {item.label}
      </Link>
    );
  }

  function renderGroupLink(item: NavItem) {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`flex items-center gap-2 pl-8 py-2 text-sm rounded-md transition-colors ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        {item.Icon ? <item.Icon className="w-4 h-4 shrink-0" /> : null}
        <span>{item.label}</span>
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
          {topNavItems.map((item) => renderNavLink(item))}

          <div>
            <button
              type="button"
              onClick={toggleGroup}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
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
                {personalInjuryItems.map((item) => renderGroupLink(item))}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={togglePdGroup}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              <span>Property Damage</span>
              {pdGroupOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-white/50" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-white/50" />
              )}
            </button>

            {pdGroupOpen && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {propertyDamageItems.map((item) => renderGroupLink(item))}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={toggleMassTortGroup}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              <span>Mass Tort Intelligence</span>
              {massTortOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-white/50" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-white/50" />
              )}
            </button>

            {massTortOpen && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {massTortItems.map((item) => renderGroupLink(item))}
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={toggleAdGroup}
              className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              <span>Advertising Intelligence</span>
              {adGroupOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-white/50" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-white/50" />
              )}
            </button>

            {adGroupOpen && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {advertisingItems.map((item) => renderGroupLink(item))}
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
