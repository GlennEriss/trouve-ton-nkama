import type { AdminRole } from "@/modules/iam/domain/types";

export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "operations_admin",
  "moderation_admin",
  "finance_admin",
  "support_admin",
  "analyst_admin",
];

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    value === "super_admin" ||
    value === "operations_admin" ||
    value === "moderation_admin" ||
    value === "finance_admin" ||
    value === "support_admin" ||
    value === "analyst_admin"
  );
}
