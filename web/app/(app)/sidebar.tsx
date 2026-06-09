"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { createClient } from "@/lib/supabase/client";
import { isAdmin as isAdminRole, canManageUsers } from "@/lib/roles";
import {
  Anchor,
  Antenna,
  Bell,
  Biohazard,
  Building2,
  Car,
  ChevronDown,
  CloudLightning,
  Briefcase,
  Crosshair,
  DollarSign,
  Eye,
  Gavel,
  HardHat,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Radio,
  Scale,
  Sliders,
  TrendingUp,
  Truck,
  Bike,
  Scissors,
  Syringe,
  Leaf,
  Users,
  UserCog,
  ImageIcon,
  Map,
  ListChecks,
  Database,
  BarChart3,
  Droplets,
  Tractor,
  FlameKindling,
  Radiation,
  Smartphone,
  Gamepad2,
  Pill,
  EyeOff,
  CarFront,
  Activity,
  Newspaper,
  LogOut,
  Stethoscope,
  Thermometer,
  ShieldAlert,
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

type NavSection = {
  heading: string;
  items: NavItem[];
};

type NavGroup = {
  heading: string;
  items?: NavItem[];
  sections?: NavSection[];
};

const dataModules: NavGroup[] = [
  {
    heading: "Accident & Property Damage Intelligence",
    items: [
      { label: "Motor Vehicle", href: "/fatalities", Icon: Car },
      { label: "Large Truck", href: "/large-truck-fatalities", Icon: Truck },
      { label: "Motorcycle", href: "/motorcycle-fatalities", Icon: Bike },
      { label: "Boating", href: "/boating-accidents", Icon: Anchor },
      { label: "Construction / Job Site", href: "/construction", Icon: HardHat },
      { label: "Storm Events", href: "/storm-events", Icon: CloudLightning },
    ],
  },
  {
    heading: "Exposure & Health Signals",
    items: [
      { label: "Cancer Incidents", href: "/cancer-incidence", Icon: HeartPulse },
      { label: "Exposure Data", href: "/advertising/exposure", Icon: Biohazard },
      { label: "PFAS Contamination", href: "/advertising/pfas-contamination", Icon: Radiation },
    ],
  },
  {
    heading: "Litigation Intelligence",
    items: [
      { label: "Judicial Profiles", href: "/judicial-profiles", Icon: Scale },
      { label: "PI Viability", href: "/pi-viability", Icon: Gavel },
    ],
  },
  {
    heading: "Audiences & Media Research",
    items: [
      { label: "Market Demographics", href: "/market-demographics", Icon: Users },
    ],
  },
  {
    heading: "Advertising Research",
    sections: [
      {
        heading: "Search",
        items: [
          { label: "Google Trends", href: "/advertising/trends", Icon: TrendingUp },
          { label: "Search Visibility", href: "/advertising/search-visibility", Icon: Eye },
        ],
      },
      {
        heading: "Economics",
        items: [
          { label: "Cost Benchmarks", href: "/advertising/cost-benchmarks", Icon: DollarSign },
        ],
      },
      {
        heading: "Mass Torts",
        items: [
          { label: "Mass Tort Overview", href: "/mass-tort-overview", Icon: Newspaper },
          { label: "MDL Tracker", href: "/mdl-tracker", Icon: Gavel },
        ],
      },
    ],
  },
];

// Alphabetized emerging tort pages (moved out of Advertising Research accordion)
const EMERGING_TORTS: NavItem[] = [
  { label: "AI Suicide / Self-Harm (Pre-MDL)", href: "/advertising/ai-suicide", Icon: ShieldAlert },
  { label: "Dupixent CTCL (Pre-MDL)", href: "/advertising/dupixent", Icon: Syringe },
  { label: "Olympus Scopes (Pre-MDL)", href: "/advertising/olympus-scopes", Icon: Stethoscope },
  { label: "Recall Watchlist", href: "/advertising/recall-watchlist", Icon: Thermometer },
];

// Alphabetized active MDL tort pages (moved out of Advertising Research accordion)
const ACTIVE_MDLS: NavItem[] = [
  { label: "AFFF / Firefighter Foam", href: "/advertising/afff-firefighting-foam", Icon: FlameKindling },
  { label: "Bair Hugger", href: "/advertising/bair-hugger", Icon: Stethoscope },
  { label: "Bard PowerPort", href: "/advertising/bard-powerport", Icon: Activity },
  { label: "Depo-Provera", href: "/advertising/depo-provera", Icon: Syringe },
  { label: "GLP-1 Gastroparesis", href: "/advertising/glp1-gastroparesis", Icon: Pill },
  { label: "GLP-1 Vision Loss", href: "/advertising/glp1-vision-loss", Icon: EyeOff },
  { label: "Hair Relaxer", href: "/advertising/hair-relaxer", Icon: Scissors },
  { label: "Lyft Sexual Assault", href: "/mdl-tracker/lyft-sexual-assault", Icon: CarFront },
  { label: "Paraquat", href: "/advertising/paraquat", Icon: Tractor },
  { label: "Roblox Abuse", href: "/advertising/roblox-abuse", Icon: Gamepad2 },
  { label: "Roundup", href: "/advertising/roundup", Icon: Leaf },
  { label: "Social Media Addiction", href: "/advertising/social-media-addiction", Icon: Smartphone },
  { label: "Talcum Powder", href: "/advertising/talcum-powder", Icon: Droplets },
  { label: "Uber Sexual Assault", href: "/mdl-tracker/uber-sexual-assault", Icon: Car },
];

// All live state pages alphabetized, preserving existing route paths
const STATE_PROFILES: NavItem[] = [
  { label: "Alabama", href: "/state-intelligence/alabama", Icon: MapPin },
  { label: "Arizona", href: "/state-intelligence/arizona", Icon: MapPin },
  { label: "Arkansas", href: "/state-intelligence/v2/arkansas", Icon: MapPin },
  { label: "California", href: "/state-intelligence/california", Icon: MapPin },
  { label: "Colorado", href: "/state-intelligence/v2/colorado", Icon: MapPin },
  { label: "Connecticut", href: "/state-intelligence/v2/connecticut", Icon: MapPin },
  { label: "Florida", href: "/state-intelligence/florida", Icon: MapPin },
  { label: "Georgia", href: "/state-intelligence/georgia", Icon: MapPin },
  { label: "Hawaii", href: "/state-intelligence/v2/hawaii", Icon: MapPin },
  { label: "Idaho", href: "/state-intelligence/v2/idaho", Icon: MapPin },
  { label: "Illinois", href: "/state-intelligence/v2/illinois", Icon: MapPin },
  { label: "Indiana", href: "/state-intelligence/v2/indiana", Icon: MapPin },
  { label: "Iowa", href: "/state-intelligence/v2/iowa", Icon: MapPin },
  { label: "Kansas", href: "/state-intelligence/v2/kansas", Icon: MapPin },
  { label: "Kentucky", href: "/state-intelligence/v2/kentucky", Icon: MapPin },
  { label: "Louisiana", href: "/state-intelligence/v2/louisiana", Icon: MapPin },
  { label: "Maine", href: "/state-intelligence/v2/maine", Icon: MapPin },
  { label: "Maryland", href: "/state-intelligence/v2/maryland", Icon: MapPin },
  { label: "Massachusetts", href: "/state-intelligence/v2/massachusetts", Icon: MapPin },
  { label: "Michigan", href: "/state-intelligence/v2/michigan", Icon: MapPin },
  { label: "Minnesota", href: "/state-intelligence/v2/minnesota", Icon: MapPin },
  { label: "Mississippi", href: "/state-intelligence/v2/mississippi", Icon: MapPin },
  { label: "Missouri", href: "/state-intelligence/v2/missouri", Icon: MapPin },
  { label: "Nebraska", href: "/state-intelligence/v2/nebraska", Icon: MapPin },
  { label: "Nevada", href: "/state-intelligence/v2/nevada", Icon: MapPin },
  { label: "New Hampshire", href: "/state-intelligence/v2/new-hampshire", Icon: MapPin },
  { label: "New Jersey", href: "/state-intelligence/v2/new-jersey", Icon: MapPin },
  { label: "New Mexico", href: "/state-intelligence/v2/new-mexico", Icon: MapPin },
  { label: "New York", href: "/state-intelligence/v2/new-york", Icon: MapPin },
  { label: "North Carolina", href: "/state-intelligence/v2/north-carolina", Icon: MapPin },
  { label: "Ohio", href: "/state-intelligence/v2/ohio", Icon: MapPin },
  { label: "Oklahoma", href: "/state-intelligence/v2/oklahoma", Icon: MapPin },
  { label: "Oregon", href: "/state-intelligence/v2/oregon", Icon: MapPin },
  { label: "Pennsylvania", href: "/state-intelligence/v2/pennsylvania", Icon: MapPin },
  { label: "South Carolina", href: "/state-intelligence/v2/south-carolina", Icon: MapPin },
  { label: "Tennessee", href: "/state-intelligence/tennessee", Icon: MapPin },
  { label: "Texas", href: "/state-intelligence/v2/texas", Icon: MapPin },
  { label: "Utah", href: "/state-intelligence/v2/utah", Icon: MapPin },
  { label: "Virginia", href: "/state-intelligence/v2/virginia", Icon: MapPin },
  { label: "Washington", href: "/state-intelligence/v2/washington", Icon: MapPin },
  { label: "West Virginia", href: "/state-intelligence/v2/west-virginia", Icon: MapPin },
  { label: "Wisconsin", href: "/state-intelligence/v2/wisconsin", Icon: MapPin },
];

type StateGroupKey = "A-C" | "D-H" | "I-M" | "N-Z";

const STATE_GROUPS: Record<StateGroupKey, NavItem[]> = {
  "A-C": STATE_PROFILES.filter(s => /^[A-C]/i.test(s.label)),
  "D-H": STATE_PROFILES.filter(s => /^[D-H]/i.test(s.label)),
  "I-M": STATE_PROFILES.filter(s => /^[I-M]/i.test(s.label)),
  "N-Z": STATE_PROFILES.filter(s => /^[N-Z]/i.test(s.label)),
};

const STATE_GROUP_KEYS: StateGroupKey[] = ["A-C", "D-H", "I-M", "N-Z"];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Managers (and Admins) can reach User Management but no other admin surface.
  const [canManage, setCanManage] = useState(false);
  // Set alongside isAdmin from the same profile fetch below. Intentionally
  // NOT using web/lib/admin/use-super-admin.ts to avoid a second identical
  // SELECT against profiles — please don't "clean this up" by swapping in
  // the hook.
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [alertUnreadCount, setAlertUnreadCount] = useState(0);
  const [emergingTortsOpen, setEmergingTortsOpen] = useState(true);
  const [activeMdlsOpen, setActiveMdlsOpen] = useState(true);
  const [stateProfilesOpen, setStateProfilesOpen] = useState(true);
  const [stateGroupOpen, setStateGroupOpen] = useState<Record<StateGroupKey, boolean>>({
    "A-C": true,
    "D-H": false,
    "I-M": false,
    "N-Z": false,
  });
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenant();

  const closeSidebar = () => setIsOpen(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile && isAdminRole(profile.role)) {
          setIsAdmin(true);
        }
        if (profile && canManageUsers(profile.role)) {
          setCanManage(true);
        }
        if (
          profile &&
          (profile as { role?: string }).role === "super_admin"
        ) {
          setIsSuperAdmin(true);
        }
      } catch {
        // ignore — default to non-admin
      }
    }
    checkRole();
  }, []);

  useEffect(() => {
    async function fetchUnreadAlerts() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { count } = await supabase
          .from("alert_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        setAlertUnreadCount(count ?? 0);
      } catch {
        // ignore
      }
    }
    fetchUnreadAlerts();
  }, []);

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
        className="fixed top-4 left-4 z-50 md:hidden rounded p-2 text-white"
        style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
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
          fixed top-0 left-0 h-full w-60 text-white flex flex-col z-50
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shrink-0
        `}
        style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
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
            src={tenant.logoUrl ?? "/logo-horizontal-white.svg"}
            alt={tenant.productName ?? "Legal Marketing Intelligence"}
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
                {group.items && (
                  <div className="flex flex-col gap-0.5 pl-2">
                    {group.items.map((item) => renderNavLink(item))}
                  </div>
                )}
                {group.sections?.map((section) => (
                  <div key={section.heading} className="mt-1">
                    <p className="px-3 pb-1 text-[10px] font-medium text-white/35">
                      {section.heading}
                    </p>
                    <div className="flex flex-col gap-0.5 pl-2">
                      {section.items.map((item) => renderNavLink(item))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Emerging Torts */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={() => setEmergingTortsOpen(!emergingTortsOpen)}
              className="flex w-full items-center justify-between px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
            >
              <span>Emerging Torts</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${emergingTortsOpen ? "" : "-rotate-90"}`} />
            </button>
            {emergingTortsOpen && (
              <div className="flex flex-col gap-0.5 pl-2">
                {EMERGING_TORTS.map((item) => renderNavLink(item))}
              </div>
            )}
          </div>

          {/* Active MDLs */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={() => setActiveMdlsOpen(!activeMdlsOpen)}
              className="flex w-full items-center justify-between px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
            >
              <span>Active MDLs</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${activeMdlsOpen ? "" : "-rotate-90"}`} />
            </button>
            {activeMdlsOpen && (
              <div className="flex flex-col gap-0.5 pl-2">
                {ACTIVE_MDLS.map((item) => renderNavLink(item))}
              </div>
            )}
          </div>

          {/* State Profiles */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={() => setStateProfilesOpen(!stateProfilesOpen)}
              className="flex w-full items-center justify-between px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
            >
              <span>State Profiles</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${stateProfilesOpen ? "" : "-rotate-90"}`} />
            </button>
            {stateProfilesOpen && (
              <div className="flex flex-col gap-1 pl-2">
                {STATE_GROUP_KEYS.map((groupKey) => {
                  const groupItems = STATE_GROUPS[groupKey];
                  if (groupItems.length === 0) return null;
                  const isGroupOpen = stateGroupOpen[groupKey];
                  return (
                    <div key={groupKey}>
                      <button
                        onClick={() =>
                          setStateGroupOpen((prev) => ({
                            ...prev,
                            [groupKey]: !prev[groupKey],
                          }))
                        }
                        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors"
                      >
                        <span>{groupKey} ({groupItems.length})</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isGroupOpen ? "" : "-rotate-90"}`} />
                      </button>
                      {isGroupOpen && (
                        <div className="flex flex-col gap-0.5 pl-2">
                          {groupItems.map((item) => renderNavLink(item))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Campaign Tools
            </p>
            <div className="flex flex-col gap-0.5 pl-2">
              {renderNavLink({ label: "Campaign Builder", href: "/campaigns/builder", Icon: Crosshair })}
              {renderNavLink({ label: "Proposal Builder", href: "/proposal-builder", Icon: Newspaper })}
              {renderNavLink({ label: "Firm Profile", href: "/settings/firms", Icon: Briefcase })}
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Monitoring
            </p>
            <div className="flex flex-col gap-0.5 pl-2">
              <Link
                href="/alerts"
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === "/alerts" || pathname.startsWith("/alerts/")
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                Alerts
                {alertUnreadCount > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-alert px-1.5 text-[11px] font-semibold text-white">
                    {alertUnreadCount > 99 ? "99+" : alertUnreadCount}
                  </span>
                )}
              </Link>
              {renderNavLink({ label: "Broadcast Intel", href: "/broadcast-intel", Icon: Antenna })}
            </div>
          </div>
          {canManage && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Admin
              </p>
              <div className="flex flex-col gap-0.5 pl-2">
                {/* User Management is open to Managers; the rest is Admin-only. */}
                {renderNavLink({ label: "User Management", href: "/admin/users", Icon: UserCog })}
                {isSuperAdmin && renderNavLink({ label: "API Costs", href: "/admin/api-costs", Icon: DollarSign })}
                {isAdmin && renderNavLink({ label: "Tort Images", href: "/admin/tort-images", Icon: ImageIcon })}
                {isAdmin && renderNavLink({ label: "Site Analytics", href: "/admin/analytics", Icon: BarChart3 })}
                {isAdmin && renderNavLink({ label: "State Rollout", href: "/admin/rollout", Icon: Map })}
                {isAdmin && renderNavLink({ label: "Tort Prioritization", href: "/admin/torts", Icon: ListChecks })}
                {isAdmin && renderNavLink({ label: "State Data Sources", href: "/admin/data-sources", Icon: Database })}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 px-3 pt-3 pb-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-slate-gray">{tenant.footerText ?? tenant.productName ?? "Legal Marketing Intelligence"}</p>
        </div>
      </aside>
    </>
  );
}
