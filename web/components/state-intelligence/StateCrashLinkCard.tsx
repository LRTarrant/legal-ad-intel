"use client";

import { Activity, ExternalLink } from "lucide-react";

export interface CrashLink {
  label: string;
  url: string;
  description: string;
}

export interface StateCrashLinkCardProps {
  stateName: string;
  headline?: string;
  body?: string;
  links: CrashLink[];
}

export function StateCrashLinkCard({
  stateName,
  headline,
  body,
  links,
}: StateCrashLinkCardProps) {
  if (links.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-intelligence-teal/30 bg-gradient-to-br from-intelligence-teal/[0.06] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          {headline ?? `${stateName} Crash Intelligence`}
        </h2>
      </div>
      {body && (
        <p className="mb-4 text-sm text-slate-gray max-w-3xl">{body}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1 rounded-lg border border-cloud bg-white p-4 transition-colors hover:border-intelligence-teal/50 hover:bg-intelligence-teal/[0.03]"
          >
            <span className="flex items-center gap-1.5 font-medium text-midnight-navy group-hover:text-intelligence-teal">
              {link.label}
              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
            </span>
            <span className="text-xs text-slate-gray leading-relaxed">
              {link.description}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
