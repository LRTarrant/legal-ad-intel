"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronRight,
  Mail,
  MailX,
  Monitor,
  MonitorOff,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { postalToStateName, stateNameToPostal } from "@/lib/usStates";

interface AlertConfig {
  id: string;
  tenant_id: string;
  user_id: string;
  tort_slug: string;
  state_code: string | null;
  alert_name: string;
  is_active: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
  recent_event_count: number;
}

interface AlertEvent {
  id: string;
  alert_config_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
  alert_configs?: {
    alert_name: string;
    tort_slug: string;
    state_code: string | null;
  };
}

interface TortOption {
  slug: string;
  label: string;
}

const TORTS: TortOption[] = [
  { slug: "depo-provera", label: "Depo-Provera" },
  { slug: "roundup", label: "Roundup" },
  { slug: "hair-relaxer", label: "Hair Relaxer" },
  { slug: "talcum-powder", label: "Talcum Powder" },
  { slug: "paraquat", label: "Paraquat" },
  { slug: "afff-firefighting-foam", label: "AFFF / Firefighter Foam" },
  { slug: "bard-powerport", label: "Bard PowerPort" },
  { slug: "social-media-addiction", label: "Social Media Addiction" },
  { slug: "roblox-abuse", label: "Roblox Abuse" },
  { slug: "glp1-gastroparesis", label: "GLP-1 Gastroparesis" },
  { slug: "glp1-vision-loss", label: "GLP-1 Vision Loss" },
  { slug: "uber-sexual-assault", label: "Uber Sexual Assault" },
  { slug: "lyft-sexual-assault", label: "Lyft Sexual Assault" },
];

const STATE_OPTIONS = Object.entries(stateNameToPostal)
  .map(([name, code]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function AlertsClient() {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/events?limit=50");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.allSettled([fetchAlerts(), fetchEvents()]);
      setLoading(false);
    }
    load();
  }, [fetchAlerts, fetchEvents]);

  async function markAsRead(eventId: string) {
    await fetch(`/api/alerts/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    });
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, is_read: true } : e)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    await fetch("/api/alerts/events/mark-all-read", { method: "PATCH" });
    setEvents((prev) => prev.map((e) => ({ ...e, is_read: true })));
    setUnreadCount(0);
  }

  async function toggleAlert(
    alertId: string,
    field: "is_active" | "email_enabled" | "in_app_enabled",
  ) {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return;
    const newValue = !alert[field];
    await fetch(`/api/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, [field]: newValue } : a)),
    );
  }

  async function deleteAlert(alertId: string) {
    if (!confirm("Delete this alert and all its events?")) return;
    await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setEvents((prev) => prev.filter((e) => e.alert_config_id !== alertId));
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-intelligence-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Alert Events Feed */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-intelligence-teal" />
            <h2 className="text-xl font-semibold text-midnight-navy">
              Alert Events
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-alert/10 px-2.5 py-0.5 text-xs font-semibold text-alert ring-1 ring-alert/30">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-intelligence-teal hover:bg-intelligence-teal/10 transition-colors"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <BellOff className="mx-auto h-10 w-10 text-slate-gray/40" />
            <p className="mt-3 text-sm text-slate-gray">
              No alert events yet. Create an alert below to start monitoring
              competitors.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`rounded-lg bg-white shadow-sm transition-colors ${
                  !event.is_read ? "border-l-4 border-intelligence-teal" : ""
                }`}
              >
                <button
                  onClick={() => {
                    setExpandedEvent(
                      expandedEvent === event.id ? null : event.id,
                    );
                    if (!event.is_read) markAsRead(event.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {expandedEvent === event.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-gray" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-gray" />
                  )}
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      event.is_read ? "bg-slate-gray/20" : "bg-intelligence-teal"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${
                        event.is_read
                          ? "text-slate-gray"
                          : "font-medium text-midnight-navy"
                      }`}
                    >
                      {event.title}
                    </p>
                    {event.alert_configs && (
                      <p className="text-xs text-slate-gray/70 truncate">
                        {event.alert_configs.alert_name}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-gray">
                    {formatTimeAgo(event.created_at)}
                  </span>
                </button>

                {expandedEvent === event.id && (
                  <div className="border-t border-gray-100 px-4 py-3 pl-12">
                    {event.description && (
                      <p className="text-sm text-slate-gray mb-2">
                        {event.description}
                      </p>
                    )}
                    {event.metadata && (
                      <div className="flex flex-wrap gap-2">
                        {Boolean(event.metadata.advertiser_name) && (
                          <span className="inline-flex items-center rounded-full bg-intelligence-teal/10 px-2.5 py-0.5 text-xs font-medium text-intelligence-teal ring-1 ring-intelligence-teal/30">
                            {String(event.metadata.advertiser_name)}
                          </span>
                        )}
                        {Boolean(event.metadata.platform) && (
                          <span className="inline-flex items-center rounded-full bg-midnight-navy/5 px-2.5 py-0.5 text-xs font-medium text-midnight-navy ring-1 ring-midnight-navy/10">
                            {String(event.metadata.platform)}
                          </span>
                        )}
                        {Boolean(event.metadata.ad_count) && (
                          <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning ring-1 ring-warning/30">
                            {String(event.metadata.ad_count)} ad(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alert Configurations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-midnight-navy">
            Alert Configurations
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-md bg-intelligence-teal px-4 py-2 text-sm font-medium text-white hover:bg-intelligence-teal/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New Alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-slate-gray/40" />
            <p className="mt-3 text-sm text-slate-gray">
              No alerts configured. Click &ldquo;Create New Alert&rdquo; to get
              started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={toggleAlert}
                onDelete={deleteAlert}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <CreateAlertModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onToggle,
  onDelete,
}: {
  alert: AlertConfig;
  onToggle: (id: string, field: "is_active" | "email_enabled" | "in_app_enabled") => void;
  onDelete: (id: string) => void;
}) {
  const stateName = alert.state_code
    ? postalToStateName[alert.state_code] ?? alert.state_code
    : "All States";

  return (
    <div
      className={`rounded-lg bg-white p-5 shadow-sm ${
        !alert.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-midnight-navy truncate">
            {alert.alert_name}
          </h3>
          <p className="text-xs text-slate-gray mt-0.5">
            {alert.tort_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
            &middot; {stateName}
          </p>
        </div>
        <button
          onClick={() => onDelete(alert.id)}
          className="shrink-0 rounded p-1 text-slate-gray/50 hover:text-alert hover:bg-alert/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <ToggleButton
          active={alert.is_active}
          onClick={() => onToggle(alert.id, "is_active")}
          label="Active"
          Icon={alert.is_active ? Bell : BellOff}
        />
        <ToggleButton
          active={alert.email_enabled}
          onClick={() => onToggle(alert.id, "email_enabled")}
          label="Email"
          Icon={alert.email_enabled ? Mail : MailX}
        />
        <ToggleButton
          active={alert.in_app_enabled}
          onClick={() => onToggle(alert.id, "in_app_enabled")}
          label="In-App"
          Icon={alert.in_app_enabled ? Monitor : MonitorOff}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-gray">
        <span>
          {alert.recent_event_count} event
          {alert.recent_event_count !== 1 ? "s" : ""} (30d)
        </span>
        <span>
          Created {new Date(alert.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-intelligence-teal/10 text-intelligence-teal"
          : "bg-gray-100 text-slate-gray/50"
      }`}
      title={`${active ? "Disable" : "Enable"} ${label}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function CreateAlertModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tortSlug, setTortSlug] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [alertName, setAlertName] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate alert name
  const autoName = useMemo(() => {
    if (!tortSlug) return "";
    const tort = TORTS.find((t) => t.slug === tortSlug);
    const state = stateCode
      ? postalToStateName[stateCode] ?? stateCode
      : "All States";
    return `${tort?.label ?? tortSlug} - ${state}`;
  }, [tortSlug, stateCode]);

  useEffect(() => {
    if (!alertName || alertName === autoName) {
      setAlertName(autoName);
    }
    // Only update when autoName changes, not alertName
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tortSlug) {
      setError("Please select a tort");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_slug: tortSlug,
          state_code: stateCode || null,
          alert_name: alertName || autoName,
          email_enabled: emailEnabled,
          in_app_enabled: inAppEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create alert");
        return;
      }

      onCreated();
    } catch {
      setError("Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-midnight-navy">
            Create New Alert
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-gray hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight-navy mb-1">
              Tort
            </label>
            <select
              value={tortSlug}
              onChange={(e) => setTortSlug(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <option value="">Select a tort...</option>
              {TORTS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-midnight-navy mb-1">
              State (optional)
            </label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <option value="">All States</option>
              {STATE_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-midnight-navy mb-1">
              Alert Name
            </label>
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder={autoName || "Alert name..."}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-midnight-navy">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="rounded border-gray-300 text-intelligence-teal focus:ring-intelligence-teal"
              />
              Email notifications
            </label>
            <label className="flex items-center gap-2 text-sm text-midnight-navy">
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
                className="rounded border-gray-300 text-intelligence-teal focus:ring-intelligence-teal"
              />
              In-app notifications
            </label>
          </div>

          {error && (
            <p className="text-sm text-alert">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-gray hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-intelligence-teal px-4 py-2 text-sm font-medium text-white hover:bg-intelligence-teal/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
