"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:text-white"
      >
        {open ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-midnight-navy px-6 py-4">
          <nav className="flex flex-col gap-3">
            <a
              href="#product"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white/70 hover:text-white"
            >
              Product
            </a>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white/70 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white/70 hover:text-white"
            >
              Log In
            </Link>
            <a
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3XXY399Oa7NMayI440CLGX6lfbB9yEKqA5XSMIZ_0zYG9RwkL0ajU8usBrg3oJcPSLWbhP7OsJ"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block rounded-full bg-intelligence-teal px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-intelligence-teal/90"
            >
              Schedule a Demo
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
