"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { createClient } from "@/lib/supabase/client";
import {
  canRemoveUser,
  invitableRoles,
  isAdmin,
  roleLabel,
  type Role,
} from "@/lib/roles";
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
  const [inviteRole, setInviteRole] = useState<Role>("user");
  const [inviteTrialDays, setInviteTrialDays] = useState<number | null>(14);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [removing, setRemoving] = useState(false);

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

  useEffect(() => {
    async function checkSuperAdmin() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setCurrentUserId(user.id);
        if (profile) setCurrentUserRole(profile.role);
        if (profile?.role === "super_admin") setIsSuperAdmin(true);
      } catch {
        // ignore
      }
    }
    checkSuperAdmin();
  }, []);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteSending(true);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          trial_days: inviteRole === "user" ? inviteTrialDays : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "Failed to send invitation");
        return;
      }

      showToast("success", `Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("user");
      setInviteTrialDays(14);
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

  function canRemoveThisUser(u: UserRow): boolean {
    if (!currentUserId || !currentUserRole) return false;
    if (u.id === currentUserId) return false;
    return canRemoveUser(currentUserRole, u.role);
  }

  async function handleRemoveUser() {
    if (!removeTarget) return;
    setRemoving(true);

    try {
      const res = await fetch(`/api/admin/users/${removeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "Failed to remove user");
        return;
      }

      showToast("success", "User removed successfully");
      fetchData();
    } catch {
      showToast("error", "Failed to remove user");
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
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
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
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
                          isAdmin(u.role) || u.role === "manager"
                            ? { backgroundColor: `${accentColor}20`, color: accentColor }
                            : { backgroundColor: "#e2e8f0", color: "#475569" }
                        }
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(u.last_sign_in_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canRemoveThisUser(u) && (
                        <button
                          onClick={() => setRemoveTarget(u)}
                          className="text-red-500 transition hover:text-red-700"
                          title="Remove user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                          isAdmin(inv.role) || inv.role === "manager"
                            ? { backgroundColor: `${accentColor}20`, color: accentColor }
                            : { backgroundColor: "#e2e8f0", color: "#475569" }
                        }
                      >
                        {roleLabel(inv.role)}
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
                  onChange={(e) => {
                    const role = e.target.value as Role;
                    setInviteRole(role);
                    if (role === "user") setInviteTrialDays(14);
                    else setInviteTrialDays(null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  {invitableRoles(currentUserRole).map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>

              {inviteRole === "user" && (
                <div>
                  <label htmlFor="inviteTrialDays" className="block text-sm font-medium text-slate-700">
                    Trial Duration
                  </label>
                  <select
                    id="inviteTrialDays"
                    value={inviteTrialDays ?? "unlimited"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInviteTrialDays(v === "unlimited" ? null : Number(v));
                    }}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    {isSuperAdmin && <option value="unlimited">No trial (unlimited)</option>}
                  </select>
                </div>
              )}

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

      {/* Remove User Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Remove User</h3>
              <button
                onClick={() => setRemoveTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to remove{" "}
              <span className="font-medium text-charcoal">
                {removeTarget.full_name || removeTarget.email}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveUser}
                disabled={removing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
