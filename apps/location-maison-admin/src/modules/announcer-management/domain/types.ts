export type AnnouncerPresenceFilter = "all" | "online" | "offline";
export type AnnouncerStatusFilter = "all" | "active" | "suspended" | "archived";

export type AnnouncerListItem = {
  uid: string;
  fullName: string;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  presenceStatus: "online" | "offline";
  isSuspended: boolean;
  state: string | null;
  announcerSinceAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
};

export type ListAnnouncersInput = {
  limit: number;
  cursor?: string | null;
  query?: string;
  status?: AnnouncerStatusFilter;
  presence?: AnnouncerPresenceFilter;
};

export type ListAnnouncersResult = {
  announcers: AnnouncerListItem[];
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
    status: AnnouncerStatusFilter;
    presence: AnnouncerPresenceFilter;
    limit: number;
  };
};
