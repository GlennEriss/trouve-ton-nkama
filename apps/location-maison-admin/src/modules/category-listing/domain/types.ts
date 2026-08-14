export type CategoryListingAttributeValue = string | number | boolean;

export type CreateCategoryListingInput = {
  categoryId: string;
  announcerUid: string;
  title: string;
  description: string;
  price: number;
  province: string;
  city: string;
  images: Array<{ fileURL: string; filePATH: string }>;
  contact?: string;
  whatsappContact?: string;
  callContact?: string;
  attributes: Record<string, CategoryListingAttributeValue>;
  actorUid: string;
};

export type CreateCategoryListingResult = {
  propertyId: string;
  categoryId: string;
  categoryPath: { lvl0: string; lvl1: string };
  announcerUid: string;
  moderationStatus: "PENDING";
};
