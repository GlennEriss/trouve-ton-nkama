import type { AdminRole, AdminStatus, AdminUser } from "@/modules/iam/domain/types";

export type AdminPresenceStatus = "online" | "offline";

export type AdminListItem = AdminUser & {
  presenceStatus: AdminPresenceStatus;
};

export type ListAdminsResult = {
  admins: AdminListItem[];
  count: number;
  onlineCount: number;
  offlineCount: number;
};

export type InviteAdminInput = {
  email: string;
  role: AdminRole;
  displayName?: string | null;
};

export type UpdateAdminRolesInput = {
  uid: string;
  roles: AdminRole[];
};

export type UpdateAdminStatusInput = {
  uid: string;
  status: Exclude<AdminStatus, "invited">;
};

export type AdminInvitation = {
  email: string;
  role: AdminRole;
  invitedBy: string;
  targetUid: string;
  status: "pending";
};
