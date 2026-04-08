"use client";

import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "#filters", label: "Filters" },
  { href: "#overview", label: "Overview" },
  { href: "#developments", label: "Latest Developments" },
  { href: "#jpml-summary", label: "JPML Summary" },
  { href: "#jpml-snapshot", label: "JPML Snapshot" },
  { href: "#mdl-table", label: "MDL Table" },
];

export function MdlTrackerNav() {
  const [activeSection, setActiveSection] = useState("filters");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sectionIds = NAV_ITEMS.map((item) => item.href.slice(1));

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.3, rootMargin: "-60px 0px -40% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav
      className="sticky top-0 z-30 bg-white border-b shadow-sm w-full"
      style={{ borderColor: "#F1F5F9" }}
      aria-label="MDL Tracker page sections"
    >
      <div
        className="flex overflow-x-auto gap-2 px-4 md:px-6 py-2 no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {NAV_ITEMS.map((item) => {
          const sectionId = item.href.slice(1);
          const isActive = activeSection === sectionId;
          return (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: isActive ? "#1A8C96" : "transparent",
                color: isActive ? "#ffffff" : "#1A8C96",
                border: isActive ? "1px solid #1A8C96" : "1px solid #1A8C96",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
