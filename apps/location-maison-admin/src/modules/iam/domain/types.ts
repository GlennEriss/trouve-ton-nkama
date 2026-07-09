export type AdminRole =
  | "super_admin"
  | "operations_admin"
  | "moderation_admin"
  | "finance_admin"
  | "support_admin"
  | "analyst_admin";

export type AdminStatus = "active" | "suspended" | "invited" | "revoked";

export type AdminPermission = `${string}.${string}`;

export type AdminUser = {
  uid: string;
  email: string;
  displayName: string | null;
  status: AdminStatus;
  roles: AdminRole[];
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  createdAt?: string | null;
};

export type AuthenticatedAdmin = {
  uid: string;
  email: string;
  displayName: string | null;
  roles: AdminRole[];
  permissions: AdminPermission[];
};
