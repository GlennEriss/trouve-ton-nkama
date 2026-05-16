export type ListingTag = {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type CreateListingTagInput = {
  name: string;
  isActive?: boolean;
  order?: number;
  actorUid: string;
};

export type UpdateListingTagInput = {
  tagId: string;
  patch: {
    name?: string;
    isActive?: boolean;
    order?: number;
  };
  actorUid: string;
};
