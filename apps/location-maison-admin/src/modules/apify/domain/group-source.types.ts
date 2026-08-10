export type FacebookGroupSource = {
  id: string;
  url: string;
  canonicalKey: string;
  label: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
};

export type CreateFacebookGroupSourceInput = {
  url: string;
  label?: string;
  actorUid: string;
};

export type UpdateFacebookGroupSourceInput = {
  groupId: string;
  patch: {
    url?: string;
    label?: string | null;
  };
  actorUid: string;
};
