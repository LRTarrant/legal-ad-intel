// Centralized role hierarchy for tenant capability checks.
//
// Tenant-facing hierarchy: Admin > Manager > User.
//   - super_admin  : LMI system-wide admin (above the tenant hierarchy).
//   - tenant_admin : tenant "Admin" — full control (billing, branding, all users).
//   - manager      : can invite/remove Users and view the team roster only.
//   - user         : standard/trial product access, no admin surfaces.
//
// `member` is the legacy name for `user` (migrated in
// 20260604000000_add_manager_role_and_rename_member_to_user.sql). The OAuth
// callback historically wrote `viewer`; treat both as the lowest tier so any
// not-yet-migrated rows still resolve sensibly.

export type Role = "super_admin" | "tenant_admin" | "manager" | "user";

const RANK: Record<string, number> = {
  super_admin: 40,
  tenant_admin: 30,
  manager: 20,
  user: 10,
  // legacy aliases for the lowest tier
  member: 10,
  viewer: 10,
};

export function roleRank(role?: string | null): number {
  return RANK[role ?? ""] ?? 0;
}

/** Admin tier (full tenant control). */
export function isAdmin(role?: string | null): boolean {
  return role === "tenant_admin" || role === "super_admin";
}

/** May access user-management surfaces (invite/remove Users, view roster). */
export function canManageUsers(role?: string | null): boolean {
  return isAdmin(role) || role === "manager";
}

/** Bypasses the trial gate (Manager and above get full access). */
export function hasUnlimitedAccess(role?: string | null): boolean {
  return roleRank(role) >= RANK.manager;
}

/** Human-readable label for a role value. */
export function roleLabel(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "tenant_admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "user":
    case "member":
    case "viewer":
      return "User";
    default:
      return role;
  }
}

/**
 * Roles a caller is allowed to issue invitations for.
 * Admins can invite any tenant role; Managers can invite Users only.
 */
export function invitableRoles(callerRole?: string | null): Role[] {
  if (isAdmin(callerRole)) return ["tenant_admin", "manager", "user"];
  if (callerRole === "manager") return ["user"];
  return [];
}

/**
 * Whether `callerRole` may remove a user with `targetRole`.
 *   - nobody removes a super_admin
 *   - super_admin removes anyone (else)
 *   - tenant_admin removes managers + users (not other admins)
 *   - manager removes users only
 */
export function canRemoveUser(
  callerRole?: string | null,
  targetRole?: string | null,
): boolean {
  if (targetRole === "super_admin") return false;
  if (callerRole === "super_admin") return true;
  if (callerRole === "tenant_admin") return targetRole !== "tenant_admin";
  if (callerRole === "manager") return roleRank(targetRole) <= RANK.user;
  return false;
}

/**
 * Whether `callerRole` may change a user currently holding `targetRole` to
 * `newRole`. Role changes are **Admin-only**: the caller must have authority
 * over the current target (same rule as removal — can't touch a super_admin or
 * a peer admin) and may only assign a role they could invite (never super_admin
 * via the UI). Self-changes are rejected by the caller, not here.
 */
export function canChangeRole(
  callerRole: string | null | undefined,
  targetRole: string | null | undefined,
  newRole: string,
): boolean {
  if (!isAdmin(callerRole)) return false;
  if (!invitableRoles(callerRole).includes(newRole as Role)) return false;
  return canRemoveUser(callerRole, targetRole);
}
