"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { UserPlus, X, Trash2 } from "lucide-react";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  last_sign_in_at: string | null;
  created_at: string;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: "pending" | "accepted" | "expired";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "tenant_admin">("member");
  const [inviteSending, setInviteSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, invitesRes] = await Promise.allSettled([
        fetch("/api/admin/users"),
        fetch("/api/invites"),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        const data = await usersRes.value.json();
        setUsers(data.users ?? []);
      }

      if (invitesRes.status === "fulfilled" && invitesRes.value.ok) {
        const data = await invitesRes.value.json();
        setInvitations(data.invitations ?? []);
      }
    } catch {
      // silently fail — tables will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteSending(true);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "Failed to send invitation");
        return;
      }

      showToast("success", `Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      fetchData();
    } catch {
      showToast("error", "Failed to send invitation");
    } finally {
      setInviteSending(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "Failed to revoke invitation");
        return;
      }

      showToast("success", "Invitation revoked");
      fetchData();
    } catch {
      showToast("error", "Failed to revoke invitation");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-gray">Loading…</p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border border-green-500/30 bg-green-500/10 text-green-700"
              : "border border-red-500/30 bg-red-500/10 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">User Management</h1>
          <p className="mt-1 text-sm text-slate-gray">
            Manage team members and invitations
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Active Users */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal">Active Users</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Last Seen</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-charcoal">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={
                          u.role === "super_admin" || u.role === "tenant_admin"
                            ? { backgroundColor: `${accentColor}20`, color: accentColor }
                            : { backgroundColor: "#e2e8f0", color: "#475569" }
                        }
                      >
                        {u.role === "tenant_admin" ? "Admin" : u.role === "super_admin" ? "Super Admin" : "Member"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(u.last_sign_in_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invitations */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-charcoal">Pending Invitations</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingInvitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No pending invitations
                  </td>
                </tr>
              ) : (
                pendingInvitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{inv.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={
                          inv.role === "tenant_admin"
                            ? { backgroundColor: `${accentColor}20`, color: accentColor }
                            : { backgroundColor: "#e2e8f0", color: "#475569" }
                        }
                      >
                        {inv.role === "tenant_admin" ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(inv.expires_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Pending
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-red-500 transition hover:text-red-700"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="colleague@firm.com"
                />
              </div>

              <div>
                <label htmlFor="inviteRole" className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "tenant_admin")}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="member">Member</option>
                  <option value="tenant_admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {inviteSending ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
