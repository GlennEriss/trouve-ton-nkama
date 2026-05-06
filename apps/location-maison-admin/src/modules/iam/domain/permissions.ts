import type { AdminPermission, AdminRole } from "@/modules/iam/domain/types";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ["*.*"],
  operations_admin: [
    "admins.read",
    "admins.view_presence",
    "admins.view_last_login",
    "users.read",
    "users.search",
    "users.create",
    "users.update",
    "users.suspend",
    "users.reactivate",
    "users.view_presence",
    "users.view_last_seen",
    "announcers.create",
    "announcers.update",
    "listings.read",
    "listings.create",
    "listings.approve",
    "listings.reject",
    "transactions.read",
    "analytics.search_read",
    "analytics.traffic_read",
    "ads_analytics.read",
    "ads_analytics.export",
    "ads_analytics.alerts.read",
    "ads_analytics.alerts.manage",
    "audit_logs.read",
  ],
  moderation_admin: [
    "users.read",
    "users.search",
    "users.view_presence",
    "users.view_last_seen",
    "announcers.read",
    "listings.read",
    "listings.approve",
    "listings.reject",
    "audit_logs.read",
  ],
  finance_admin: [
    "users.read",
    "users.search",
    "users.view_presence",
    "users.view_last_seen",
    "credits.read",
    "credits.grant",
    "transactions.read",
    "refunds.read",
    "refunds.approve",
    "audit_logs.read",
    "analytics.traffic_read",
    "ads_analytics.read",
    "ads_analytics.export",
    "ads_analytics.alerts.read",
  ],
  support_admin: [
    "users.read",
    "users.search",
    "users.create",
    "users.suspend",
    "users.reactivate",
    "users.view_presence",
    "users.view_last_seen",
    "announcers.read",
    "announcers.create",
    "announcers.update",
    "transactions.read",
    "listings.create",
    "audit_logs.read",
    "analytics.search_read",
    "analytics.traffic_read",
  ],
  analyst_admin: [
    "admins.read",
    "admins.view_presence",
    "admins.view_last_login",
    "users.read",
    "users.search",
    "users.view_presence",
    "users.view_last_seen",
    "transactions.read",
    "audit_logs.read",
    "analytics.search_read",
    "analytics.traffic_read",
    "ads_analytics.read",
    "ads_analytics.export",
    "ads_analytics.alerts.read",
  ],
};

export function resolvePermissions(roles: AdminRole[]) {
  if (roles.includes("super_admin")) {
    return ["*.*"] as AdminPermission[];
  }

  const all = roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []);
  return Array.from(new Set(all));
}

export function hasPermission(
  permissions: AdminPermission[],
  required: AdminPermission,
) {
  return permissions.includes("*.*") || permissions.includes(required);
}
