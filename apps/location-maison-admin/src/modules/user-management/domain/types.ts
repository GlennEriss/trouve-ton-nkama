export type UserPresenceStatus = "online" | "offline";
export type UserStatusFilter = "all" | "active" | "suspended" | "archived";
export type UserRoleFilter = "all" | "user" | "announcer" | "admin";
export type UserPresenceFilter = "all" | "online" | "offline";

export type PlatformUser = {
  uid: string;
  docId: string;
  firstname: string | null;
  lastname: string | null;
  searchableName: string | null;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  metadata: Record<string, unknown> | null;
  announcerSinceAt: string | null;
  state: string | null;
  isSuspended: boolean;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PlatformUserListItem = PlatformUser & {
  fullName: string;
  presenceStatus: UserPresenceStatus;
};

export type ListPlatformUsersInput = {
  limit: number;
  cursor?: string | null;
  query?: string;
  role?: UserRoleFilter;
  status?: UserStatusFilter;
  presence?: UserPresenceFilter;
};

export type ListPlatformUsersResult = {
  users: PlatformUserListItem[];
  count: number;
  totalCount: number | null;
  onlineCount: number;
  offlineCount: number;
  suspendedCount: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    query: string;
    role: UserRoleFilter;
    status: UserStatusFilter;
    presence: UserPresenceFilter;
    limit: number;
  };
};

export type UpdatePlatformUserStatusInput = {
  uid: string;
  status: "active" | "suspended";
  actorUid: string;
};
