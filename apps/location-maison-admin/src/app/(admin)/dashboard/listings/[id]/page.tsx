"use client";

import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type ListingStatus = "FOR_RENT" | "FOR_SALE";
type ListingState = "IN_PROGRESS" | "ARCHIVED";
type ListingType =
  | "Home"
  | "Studio"
  | "Apartment"
  | "Desk"
  | "Building"
  | "Shop"
  | "Kiosk"
  | "Room"
  | "Property"
  | "Logement"
  | "Villa"
  | "Land";

type ListingDetails = {
  id: string;
  title: string;
  description: string;
  typeProperty: ListingType | null;
  status: ListingStatus | null;
  state: string | null;
  price: number | null;
  area: number | null;
  city: string | null;
  province: string | null;
  country: string | null;
  createdBy: string | null;
  contact: string | null;
  tags: string[];
  primaryImageUrl: string | null;
  imageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  street: string | null;
  countryCode: string | null;
  additionnalInformation: string | null;
  longitude: number | null;
  latitude: number | null;
  provinceLon: number | null;
  provinceLat: number | null;
  cityLon: number | null;
  cityLat: number | null;
  streetLon: number | null;
  streetLat: number | null;
  isLocExact: boolean | null;
  nbrRooms: number | null;
  nbrKitchens: number | null;
  nbrBathrooms: number | null;
  nbrToilets: number | null;
  nbrGarages: number | null;
  nbrFloors: number | null;
  nbrLivingRoom: number | null;
  nbrFloorStudio: number | null;
  numeroStudio: string | null;
  nbrFloorApartment: number | null;
  numeroApartment: string | null;
  nbrPiscine: number | null;
  nbrApartments: number | null;
  hasParking: boolean | null;
  nbrToilet: number | null;
  kioskType: string | null;
  roomType: string | null;
  images: Array<{
    fileURL: string;
    filePATH: string;
  }>;
};

type ListingDetailsPayload = {
  listing: ListingDetails;
};

type ModerationHistoryPayload = {
  propertyId: string;
  decisions: Array<{
    id: string;
    decision:
      | "APPROVE"
      | "REJECT"
      | "ARCHIVE"
      | "UNARCHIVE"
      | "STATUS_CHANGE"
      | "BULK_ARCHIVE"
      | "BULK_UNARCHIVE"
      | "BULK_STATUS_CHANGE";
    reason: string;
    beforeState: string | null;
    afterState: string | null;
    beforeStatus: "FOR_RENT" | "FOR_SALE" | null;
    afterStatus: "FOR_RENT" | "FOR_SALE" | null;
    actorId: string;
    actorRoles: string[];
    correlationId: string | null;
    createdAt: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    status: string | null;
    actorId: string | null;
    actorRoles: string[];
    correlationId: string | null;
    resource: string | null;
    resourceId: string | null;
    details: Record<string, unknown> | null;
    diff: Record<string, unknown> | null;
    createdAt: string | null;
  }>;
};

type ListingDuplicatesPayload = {
  propertyId: string;
  count: number;
  groups: Array<{
    clusterId: string;
    reason: "same_signature" | "same_primary_image" | "semantic_similarity";
    confidence: number;
    resolution: {
      action:
        | "not_duplicate"
        | "confirm_duplicate"
        | "archive_target"
        | "keep_one_archive_others"
        | "needs_review";
      reviewedAt: string | null;
    } | null;
    listings: Array<{
      id: string;
      title: string;
      status: "FOR_RENT" | "FOR_SALE" | null;
      state: string | null;
      price: number | null;
      city: string | null;
      province: string | null;
      createdBy: string | null;
      primaryImageUrl: string | null;
      createdAt: string | null;
    }>;
  }>;
};

type AuthMePayload = {
  admin: {
    roles: string[];
    permissions: string[];
  };
};

type EditFormState = {
  title: string;
  description: string;
  typeProperty: ListingType;
  status: ListingStatus;
  price: string;
  area: string;
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  contact: string;
  additionnalInformation: string;
  tagsRaw: string;
  longitude: string;
  latitude: string;
  provinceLon: string;
  provinceLat: string;
  cityLon: string;
  cityLat: string;
  streetLon: string;
  streetLat: string;
  isLocExact: boolean;
  nbrRooms: string;
  nbrKitchens: string;
  nbrBathrooms: string;
  nbrToilets: string;
  nbrGarages: string;
  nbrFloors: string;
  nbrLivingRoom: string;
  nbrFloorStudio: string;
  numeroStudio: string;
  nbrFloorApartment: string;
  numeroApartment: string;
  nbrPiscine: string;
  nbrApartments: string;
  hasParking: "" | "true" | "false";
  nbrToilet: string;
  kioskType: string;
  roomType: string;
  imagesRaw: string;
  statusReason: string;
};

type TabKey = "details" | "media" | "history" | "duplicates";

type ModerationReasonAction =
  | {
      kind: "state";
      nextState: ListingState;
    }
  | {
      kind: "status";
      nextStatus: ListingStatus;
    }
  | {
      kind: "moderation";
      decision: "approve" | "reject";
    };

const TYPE_OPTIONS: ListingType[] = [
  "Home",
  "Studio",
  "Apartment",
  "Desk",
  "Building",
  "Shop",
  "Kiosk",
  "Room",
  "Property",
  "Logement",
  "Villa",
  "Land",
];

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function canFinalizeDuplicateDecisions(roles: string[]) {
  return roles.some(
    (role) =>
      role === "super_admin" ||
      role === "operations_admin" ||
      role === "moderation_admin",
  );
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

function toDateLabel(value?: string | null) {
  if (!value) {
    return "Inconnu";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Inconnu";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: ListingStatus | null) {
  if (status === "FOR_RENT") return "À louer";
  if (status === "FOR_SALE") return "À vendre";
  return "N/A";
}

function stateLabel(state: string | null) {
  if (state === "IN_PROGRESS") return "Actif";
  if (state === "ARCHIVED") return "Archivé";
  return state ?? "N/A";
}

function normalizeNumberString(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return String(value);
}

function splitTags(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 6);
}

function splitImageUrls(value: string) {
  return value
    .split(/\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 30);
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

function toEditForm(listing: ListingDetails): EditFormState {
  return {
    title: listing.title ?? "",
    description: listing.description ?? "",
    typeProperty: listing.typeProperty ?? "Property",
    status: listing.status ?? "FOR_RENT",
    price: normalizeNumberString(listing.price),
    area: normalizeNumberString(listing.area),
    street: listing.street ?? "",
    city: listing.city ?? "",
    province: listing.province ?? "",
    country: listing.country ?? "",
    countryCode: listing.countryCode ?? "",
    contact: listing.contact ?? "",
    additionnalInformation: listing.additionnalInformation ?? "",
    tagsRaw: listing.tags.join(", "),
    longitude: normalizeNumberString(listing.longitude),
    latitude: normalizeNumberString(listing.latitude),
    provinceLon: normalizeNumberString(listing.provinceLon),
    provinceLat: normalizeNumberString(listing.provinceLat),
    cityLon: normalizeNumberString(listing.cityLon),
    cityLat: normalizeNumberString(listing.cityLat),
    streetLon: normalizeNumberString(listing.streetLon),
    streetLat: normalizeNumberString(listing.streetLat),
    isLocExact: listing.isLocExact ?? false,
    nbrRooms: normalizeNumberString(listing.nbrRooms),
    nbrKitchens: normalizeNumberString(listing.nbrKitchens),
    nbrBathrooms: normalizeNumberString(listing.nbrBathrooms),
    nbrToilets: normalizeNumberString(listing.nbrToilets),
    nbrGarages: normalizeNumberString(listing.nbrGarages),
    nbrFloors: normalizeNumberString(listing.nbrFloors),
    nbrLivingRoom: normalizeNumberString(listing.nbrLivingRoom),
    nbrFloorStudio: normalizeNumberString(listing.nbrFloorStudio),
    numeroStudio: listing.numeroStudio ?? "",
    nbrFloorApartment: normalizeNumberString(listing.nbrFloorApartment),
    numeroApartment: listing.numeroApartment ?? "",
    nbrPiscine: normalizeNumberString(listing.nbrPiscine),
    nbrApartments: normalizeNumberString(listing.nbrApartments),
    hasParking:
      listing.hasParking == null ? "" : listing.hasParking ? "true" : "false",
    nbrToilet: normalizeNumberString(listing.nbrToilet),
    kioskType: listing.kioskType ?? "",
    roomType: listing.roomType ?? "",
    imagesRaw: listing.images.map((image) => image.fileURL).join("\n"),
    statusReason: "",
  };
}

function maybeSetString(
  payload: Record<string, unknown>,
  key: string,
  nextValue: string,
  previousValue: string | null | undefined,
) {
  const normalizedNext = nextValue.trim();
  const normalizedPrevious = (previousValue ?? "").trim();
  if (normalizedNext !== normalizedPrevious) {
    payload[key] = normalizedNext;
  }
}

function maybeSetNumber(
  payload: Record<string, unknown>,
  key: string,
  rawValue: string,
  previousValue: number | null | undefined,
) {
  const value = rawValue.trim();
  if (!value) {
    return;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return;
  }
  if ((previousValue ?? null) !== parsed) {
    payload[key] = parsed;
  }
}

function buildPatchPayload(form: EditFormState, listing: ListingDetails) {
  const payload: Record<string, unknown> = {};

  maybeSetString(payload, "title", form.title, listing.title);
  maybeSetString(payload, "description", form.description, listing.description);
  maybeSetString(payload, "typeProperty", form.typeProperty, listing.typeProperty);

  if (form.status !== (listing.status ?? "FOR_RENT")) {
    payload.status = form.status;
    payload.reason = form.statusReason.trim();
  }

  maybeSetNumber(payload, "price", form.price, listing.price);
  maybeSetNumber(payload, "area", form.area, listing.area);

  maybeSetString(payload, "street", form.street, listing.street);
  maybeSetString(payload, "city", form.city, listing.city);
  maybeSetString(payload, "province", form.province, listing.province);
  maybeSetString(payload, "country", form.country, listing.country);
  maybeSetString(payload, "countryCode", form.countryCode, listing.countryCode);
  maybeSetString(payload, "contact", form.contact, listing.contact);
  maybeSetString(
    payload,
    "additionnalInformation",
    form.additionnalInformation,
    listing.additionnalInformation,
  );

  maybeSetNumber(payload, "longitude", form.longitude, listing.longitude);
  maybeSetNumber(payload, "latitude", form.latitude, listing.latitude);
  maybeSetNumber(payload, "provinceLon", form.provinceLon, listing.provinceLon);
  maybeSetNumber(payload, "provinceLat", form.provinceLat, listing.provinceLat);
  maybeSetNumber(payload, "cityLon", form.cityLon, listing.cityLon);
  maybeSetNumber(payload, "cityLat", form.cityLat, listing.cityLat);
  maybeSetNumber(payload, "streetLon", form.streetLon, listing.streetLon);
  maybeSetNumber(payload, "streetLat", form.streetLat, listing.streetLat);

  if (form.isLocExact !== (listing.isLocExact ?? false)) {
    payload.isLocExact = form.isLocExact;
  }

  maybeSetNumber(payload, "nbrRooms", form.nbrRooms, listing.nbrRooms);
  maybeSetNumber(payload, "nbrKitchens", form.nbrKitchens, listing.nbrKitchens);
  maybeSetNumber(payload, "nbrBathrooms", form.nbrBathrooms, listing.nbrBathrooms);
  maybeSetNumber(payload, "nbrToilets", form.nbrToilets, listing.nbrToilets);
  maybeSetNumber(payload, "nbrGarages", form.nbrGarages, listing.nbrGarages);
  maybeSetNumber(payload, "nbrFloors", form.nbrFloors, listing.nbrFloors);
  maybeSetNumber(payload, "nbrLivingRoom", form.nbrLivingRoom, listing.nbrLivingRoom);
  maybeSetNumber(payload, "nbrFloorStudio", form.nbrFloorStudio, listing.nbrFloorStudio);
  maybeSetString(payload, "numeroStudio", form.numeroStudio, listing.numeroStudio);
  maybeSetNumber(
    payload,
    "nbrFloorApartment",
    form.nbrFloorApartment,
    listing.nbrFloorApartment,
  );
  maybeSetString(payload, "numeroApartment", form.numeroApartment, listing.numeroApartment);
  maybeSetNumber(payload, "nbrPiscine", form.nbrPiscine, listing.nbrPiscine);
  maybeSetNumber(payload, "nbrApartments", form.nbrApartments, listing.nbrApartments);
  maybeSetNumber(payload, "nbrToilet", form.nbrToilet, listing.nbrToilet);
  maybeSetString(payload, "kioskType", form.kioskType, listing.kioskType);
  maybeSetString(payload, "roomType", form.roomType, listing.roomType);

  if (form.hasParking === "true" && listing.hasParking !== true) {
    payload.hasParking = true;
  }
  if (form.hasParking === "false" && listing.hasParking !== false) {
    payload.hasParking = false;
  }

  const nextTags = splitTags(form.tagsRaw);
  const prevTags = listing.tags;
  if (JSON.stringify(nextTags) !== JSON.stringify(prevTags)) {
    payload.tags = nextTags;
  }

  const nextImages = splitImageUrls(form.imagesRaw).map((url) => ({
    fileURL: url,
    filePATH: "",
  }));
  const prevImages = listing.images.map((image) => ({
    fileURL: image.fileURL,
    filePATH: image.filePATH || "",
  }));
  if (JSON.stringify(nextImages) !== JSON.stringify(prevImages)) {
    payload.images = nextImages;
  }

  return payload;
}

function decisionLabel(decision: string) {
  switch (decision) {
    case "APPROVE":
      return "Approuver";
    case "REJECT":
      return "Rejeter";
    case "ARCHIVE":
      return "Archiver";
    case "UNARCHIVE":
      return "Désarchiver";
    case "STATUS_CHANGE":
      return "Changer statut";
    case "BULK_ARCHIVE":
      return "Archivage en masse";
    case "BULK_UNARCHIVE":
      return "Désarchivage en masse";
    case "BULK_STATUS_CHANGE":
      return "Statut en masse";
    default:
      return decision;
  }
}

function duplicateReasonLabel(
  reason: "same_signature" | "same_primary_image" | "semantic_similarity",
) {
  if (reason === "same_signature") {
    return "Signature quasi identique";
  }
  if (reason === "same_primary_image") {
    return "Même image principale";
  }
  return "Similarité sémantique";
}

function duplicateResolutionLabel(
  action:
    | "not_duplicate"
    | "confirm_duplicate"
    | "archive_target"
    | "keep_one_archive_others"
    | "needs_review"
    | null,
) {
  if (!action) {
    return "En attente de traitement";
  }
  if (action === "not_duplicate") {
    return "Pas un doublon";
  }
  if (action === "confirm_duplicate") {
    return "Doublon confirmé";
  }
  if (action === "archive_target") {
    return "Résolu (cible archivée)";
  }
  if (action === "keep_one_archive_others") {
    return "Résolu (1 conservée, autres archivées)";
  }
  return "À revoir";
}

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const listingId = (params?.id ?? "").trim();

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [formState, setFormState] = useState<EditFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [resolvingDuplicateClusterId, setResolvingDuplicateClusterId] = useState<string | null>(null);
  const [deletingDuplicateListingId, setDeletingDuplicateListingId] = useState<string | null>(null);
  const [deletingDuplicateClusterId, setDeletingDuplicateClusterId] = useState<string | null>(null);
  const [duplicateHardDeleteReason, setDuplicateHardDeleteReason] = useState(
    "Suppression definitive annonce doublon archivee depuis fiche annonce.",
  );
  const [duplicateDecisionNoteByCluster, setDuplicateDecisionNoteByCluster] = useState<Record<string, string>>({});
  const [duplicateTargetByCluster, setDuplicateTargetByCluster] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<ModerationReasonAction | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const listingQuery = useQuery({
    queryKey: ["dashboard", "listings", "details", listingId],
    enabled: Boolean(listingId),
    queryFn: () =>
      fetchJson<ListingDetailsPayload>(
        `/api/admin/v1/listings/${listingId}`,
        "Impossible de charger l'annonce.",
      ),
  });

  const moderationHistoryQuery = useQuery({
    queryKey: ["dashboard", "listings", listingId, "moderation-history"],
    enabled: Boolean(listingId),
    queryFn: () =>
      fetchJson<ModerationHistoryPayload>(
        `/api/admin/v1/listings/${listingId}/moderation/history?limit=120`,
        "Impossible de charger l'historique de modération.",
      ),
  });

  const duplicatesQuery = useQuery({
    queryKey: ["dashboard", "listings", listingId, "duplicates"],
    enabled:
      Boolean(listingId) &&
      hasPermission(
        permissionsQuery.data?.admin.permissions ?? [],
        "listings.duplicates.read",
      ),
    queryFn: () =>
      fetchJson<ListingDuplicatesPayload>(
        `/api/admin/v1/listings/${listingId}/duplicates?limit=1200&minGroupSize=2&includeSemantic=true`,
        "Impossible de charger les doublons de cette annonce.",
      ),
  });

  const permissions = useMemo(
    () => permissionsQuery.data?.admin.permissions ?? [],
    [permissionsQuery.data?.admin.permissions],
  );
  const roles = useMemo(
    () => permissionsQuery.data?.admin.roles ?? [],
    [permissionsQuery.data?.admin.roles],
  );

  const listing = listingQuery.data?.listing ?? null;

  useEffect(() => {
    if (listing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormState(toEditForm(listing));
    }
  }, [listing]);

  const canUpdateListing = hasPermission(permissions, "listings.update");
  const canChangeStatus = hasPermission(permissions, "listings.status.update");
  const canApprove = hasPermission(permissions, "listings.approve");
  const canReject = hasPermission(permissions, "listings.reject");
  const canArchive = hasPermission(permissions, "listings.archive") || hasPermission(permissions, "listings.state.update");
  const canUnarchive = hasPermission(permissions, "listings.unarchive") || hasPermission(permissions, "listings.state.update");
  const canReadDuplicates = hasPermission(permissions, "listings.duplicates.read");
  const canResolveDuplicates = hasPermission(permissions, "listings.duplicates.resolve");
  const canFinalizeDuplicates = canFinalizeDuplicateDecisions(roles);
  const canHardDeleteListings =
    hasPermission(permissions, "listings.delete.hard") && roles.includes("super_admin");

  const refreshAll = useCallback(async () => {
    await Promise.all([
      listingQuery.refetch(),
      moderationHistoryQuery.refetch(),
      canReadDuplicates ? duplicatesQuery.refetch() : Promise.resolve(),
    ]);
  }, [canReadDuplicates, duplicatesQuery, listingQuery, moderationHistoryQuery]);

  const runModerationAction = useCallback(
    async (
      endpoint: string,
      payload: Record<string, unknown>,
      successMessage: string,
    ) => {
      setIsModerating(true);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Action impossible." : result.error?.message);
        }

        setGlobalMessage(successMessage);
        await refreshAll();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Action impossible.");
      } finally {
        setIsModerating(false);
      }
    },
    [refreshAll],
  );

  const resolveDuplicateCluster = useCallback(
    async (
      clusterId: string,
      action:
        | "not_duplicate"
        | "confirm_duplicate"
        | "archive_target"
        | "keep_one_archive_others"
        | "needs_review",
    ) => {
      if (!canResolveDuplicates) {
        setGlobalError("Permission manquante : listings.duplicates.resolve");
        return;
      }

      if (
        action !== "needs_review" &&
        !canFinalizeDuplicates
      ) {
        setGlobalError(
          "Cette action est réservée à super_admin, operations_admin ou moderation_admin.",
        );
        return;
      }

      const targetListingId =
        (duplicateTargetByCluster[clusterId] ?? "").trim();
      if (
        (action === "archive_target" ||
          action === "keep_one_archive_others") &&
        !targetListingId
      ) {
        setGlobalError(
          action === "keep_one_archive_others"
            ? "Sélectionne l'annonce à conserver."
            : "Sélectionne l'annonce cible à archiver.",
        );
        return;
      }

      const note = (duplicateDecisionNoteByCluster[clusterId] ?? "").trim();

      setResolvingDuplicateClusterId(clusterId);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(
          `/api/admin/v1/listings/duplicates/${clusterId}/resolve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
              targetListingId:
                action === "archive_target" ||
                action === "keep_one_archive_others"
                  ? targetListingId
                  : undefined,
              note: note || undefined,
              limit: 1200,
              minGroupSize: 2,
              includeSemantic: true,
            }),
          },
        );

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(
            result.success
              ? "Impossible d'enregistrer cette décision."
              : result.error?.message || "Impossible d'enregistrer cette décision.",
          );
        }

        setGlobalMessage(
          `Décision doublon enregistrée: ${duplicateResolutionLabel(action)}.`,
        );
        setDuplicateDecisionNoteByCluster((previous) => ({
          ...previous,
          [clusterId]: "",
        }));
        await refreshAll();
      } catch (error) {
        setGlobalError(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer cette décision.",
        );
      } finally {
        setResolvingDuplicateClusterId(null);
      }
    },
    [
      canFinalizeDuplicates,
      canResolveDuplicates,
      duplicateDecisionNoteByCluster,
      duplicateTargetByCluster,
      refreshAll,
    ],
  );

  const deleteListingHard = useCallback(
    async (propertyId: string) => {
      const reason = duplicateHardDeleteReason.trim();
      if (!reason || reason.length < 10) {
        throw new Error("Renseigne un motif de suppression d'au moins 10 caractères.");
      }

      const response = await fetch(`/api/admin/v1/listings/${propertyId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          confirmPropertyId: propertyId,
          confirmation: "SUPPRIMER",
        }),
      });

      const result = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } };
      if (!response.ok || !result.success) {
        throw new Error(
          result.success
            ? "Impossible de supprimer l'annonce."
            : result.error?.message || "Impossible de supprimer l'annonce.",
        );
      }
    },
    [duplicateHardDeleteReason],
  );

  const deleteArchivedDuplicateItem = useCallback(
    async (clusterId: string, propertyId: string) => {
      if (!canHardDeleteListings) {
        setGlobalError("Permission manquante : listings.delete.hard (super_admin requis).");
        return;
      }

      setDeletingDuplicateListingId(propertyId);
      setDeletingDuplicateClusterId(clusterId);
      setGlobalError(null);
      setGlobalMessage(null);
      try {
        await deleteListingHard(propertyId);
        setGlobalMessage(`Annonce supprimée définitivement: ${propertyId}.`);
        await refreshAll();
      } catch (error) {
        setGlobalError(
          error instanceof Error ? error.message : "Impossible de supprimer l'annonce.",
        );
      } finally {
        setDeletingDuplicateListingId(null);
        setDeletingDuplicateClusterId(null);
      }
    },
    [canHardDeleteListings, deleteListingHard, refreshAll],
  );

  const deleteAllArchivedDuplicateItems = useCallback(
    async (clusterId: string, propertyIds: string[]) => {
      if (!canHardDeleteListings) {
        setGlobalError("Permission manquante : listings.delete.hard (super_admin requis).");
        return;
      }
      if (!propertyIds.length) {
        setGlobalError("Aucune annonce archivée à supprimer dans ce cluster.");
        return;
      }

      setDeletingDuplicateClusterId(clusterId);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        let successCount = 0;
        const failedIds: string[] = [];
        for (const propertyId of propertyIds) {
          try {
            await deleteListingHard(propertyId);
            successCount += 1;
          } catch (_error) {
            failedIds.push(propertyId);
          }
        }

        if (failedIds.length) {
          setGlobalError(
            `Suppression partielle: ${successCount}/${propertyIds.length}. Échecs: ${failedIds.join(", ")}`,
          );
        } else {
          setGlobalMessage(`${successCount} annonces archivées supprimées définitivement.`);
        }

        await refreshAll();
      } finally {
        setDeletingDuplicateClusterId(null);
      }
    },
    [canHardDeleteListings, deleteListingHard, refreshAll],
  );

  const openReasonDialog = useCallback((action: ModerationReasonAction) => {
    setGlobalError(null);
    setReasonDraft("");
    setReasonAction(action);
  }, []);

  const closeReasonDialog = useCallback(() => {
    setReasonAction(null);
    setReasonDraft("");
    setIsSubmittingReason(false);
  }, []);

  const handleStateAction = useCallback(
    async (nextState: ListingState, reason: string) => {
      if (!listingId) return;

      setIsModerating(true);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(`/api/admin/v1/listings/${listingId}/state`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state: nextState, reason }),
        });

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Action impossible." : result.error?.message);
        }

        setGlobalMessage(nextState === "ARCHIVED" ? "Annonce archivée." : "Annonce restaurée.");
        await refreshAll();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Action impossible.");
      } finally {
        setIsModerating(false);
      }
    },
    [listingId, refreshAll],
  );

  const handleStatusAction = useCallback(
    async (nextStatus: ListingStatus, reason: string) => {
      if (!listingId) return;

      setIsModerating(true);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(`/api/admin/v1/listings/${listingId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus, reason }),
        });

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Action impossible." : result.error?.message);
        }

        setGlobalMessage("Statut mis à jour.");
        await refreshAll();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Action impossible.");
      } finally {
        setIsModerating(false);
      }
    },
    [listingId, refreshAll],
  );

  const reasonDialogMeta = useMemo(() => {
    if (!reasonAction) {
      return {
        title: "",
        description: "",
        confirmLabel: "",
      };
    }

    if (reasonAction.kind === "state") {
      const isArchive = reasonAction.nextState === "ARCHIVED";
      return {
        title: isArchive ? "Archiver l'annonce" : "Désarchiver l'annonce",
        description: "Le motif est obligatoire pour tracer ce changement d'état.",
        confirmLabel: isArchive ? "Archiver" : "Désarchiver",
      };
    }

    if (reasonAction.kind === "status") {
      const isRent = reasonAction.nextStatus === "FOR_RENT";
      return {
        title: isRent ? "Passer l'annonce à louer" : "Passer l'annonce à vendre",
        description: "Le motif est obligatoire pour tracer ce changement de statut.",
        confirmLabel: isRent ? "Mettre à louer" : "Mettre à vendre",
      };
    }

    const isApprove = reasonAction.decision === "approve";
    return {
      title: isApprove ? "Approuver l'annonce" : "Rejeter l'annonce",
      description: "Le motif de modération est obligatoire.",
      confirmLabel: isApprove ? "Approuver" : "Rejeter",
    };
  }, [reasonAction]);

  const onConfirmReason = useCallback(async () => {
    if (!reasonAction || !listing) {
      return;
    }

    const reason = reasonDraft.trim();
    if (!reason) {
      setGlobalError("Le motif est obligatoire.");
      return;
    }

    setIsSubmittingReason(true);
    try {
      if (reasonAction.kind === "state") {
        await handleStateAction(reasonAction.nextState, reason);
      } else if (reasonAction.kind === "status") {
        await handleStatusAction(reasonAction.nextStatus, reason);
      } else {
        const endpoint =
          reasonAction.decision === "approve"
            ? `/api/admin/v1/listings/${listing.id}/moderation/approve`
            : `/api/admin/v1/listings/${listing.id}/moderation/reject`;
        const successMessage =
          reasonAction.decision === "approve" ? "Annonce approuvée." : "Annonce rejetée.";
        await runModerationAction(endpoint, { reason }, successMessage);
      }

      closeReasonDialog();
    } finally {
      setIsSubmittingReason(false);
    }
  }, [
    closeReasonDialog,
    handleStateAction,
    handleStatusAction,
    listing,
    reasonAction,
    reasonDraft,
    runModerationAction,
  ]);

  const onSubmitEdition = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!listing || !formState) {
        return;
      }

      const patchPayload = buildPatchPayload(formState, listing);
      const patchFields = Object.keys(patchPayload);
      if (!patchFields.length) {
        setGlobalMessage("Aucun changement à enregistrer.");
        return;
      }

      if (patchPayload.status && !String(patchPayload.reason ?? "").trim()) {
        setGlobalError("Le motif est obligatoire pour changer le statut.");
        return;
      }

      setIsSaving(true);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(`/api/admin/v1/listings/${listing.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patchPayload),
        });

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Impossible de sauvegarder." : result.error?.message);
        }

        setGlobalMessage("Annonce mise à jour avec succès.");
        setFormState((previous) =>
          previous
            ? {
                ...previous,
                statusReason: "",
              }
            : previous,
        );
        await refreshAll();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de sauvegarder.");
      } finally {
        setIsSaving(false);
      }
    },
    [formState, listing, refreshAll],
  );

  const hasError =
    listingQuery.isError ||
    moderationHistoryQuery.isError ||
    (canReadDuplicates ? duplicatesQuery.isError : false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={listing ? `Annonce: ${listing.title}` : "Fiche annonce"}
        description="Détails, médias, historique de modération et doublons."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => window.location.assign("/dashboard/listings")}
            >
              Retour liste
            </Button>
            <Button type="button" variant="outline" onClick={() => void refreshAll()}>
              Actualiser
            </Button>
          </div>
        }
      />

      {hasError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Certaines données n&apos;ont pas pu être chargées.
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{globalError}</div>
      ) : null}

      {globalMessage ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {globalMessage}
        </div>
      ) : null}

      {listing ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Statut</p>
                <p className="text-sm font-semibold text-slate-900">{statusLabel(listing.status)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">État</p>
                <p className="text-sm font-semibold text-slate-900">{stateLabel(listing.state)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Prix</p>
                <p className="text-sm font-semibold text-slate-900">{formatMoney(listing.price)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Surface</p>
                <p className="text-sm font-semibold text-slate-900">{formatNumber(listing.area)} m²</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={!canApprove || isModerating}
                onClick={() => openReasonDialog({ kind: "moderation", decision: "approve" })}
              >
                Approuver
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canReject || isModerating}
                onClick={() => openReasonDialog({ kind: "moderation", decision: "reject" })}
              >
                Rejeter
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canArchive || isModerating}
                onClick={() => openReasonDialog({ kind: "state", nextState: "ARCHIVED" })}
              >
                Archiver
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canUnarchive || isModerating}
                onClick={() => openReasonDialog({ kind: "state", nextState: "IN_PROGRESS" })}
              >
                Désarchiver
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canChangeStatus || isModerating}
                onClick={() => openReasonDialog({ kind: "status", nextStatus: "FOR_RENT" })}
              >
                Statut: à louer
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canChangeStatus || isModerating}
                onClick={() => openReasonDialog({ kind: "status", nextStatus: "FOR_SALE" })}
              >
                Statut: à vendre
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={activeTab === "details" ? "default" : "outline"}
              onClick={() => setActiveTab("details")}
            >
              Détails
            </Button>
            <Button
              type="button"
              variant={activeTab === "media" ? "default" : "outline"}
              onClick={() => setActiveTab("media")}
            >
              Médias
            </Button>
            <Button
              type="button"
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
            >
              Historique
            </Button>
            <Button
              type="button"
              variant={activeTab === "duplicates" ? "default" : "outline"}
              onClick={() => setActiveTab("duplicates")}
            >
              Doublons
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "details" && listing && formState ? (
            <form className="space-y-4" onSubmit={onSubmitEdition}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  placeholder="Titre"
                />
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  value={formState.typeProperty}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, typeProperty: event.target.value as ListingType } : prev,
                    )
                  }
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
                placeholder="Description"
              />

              <div className="grid gap-3 md:grid-cols-4">
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, status: event.target.value as ListingStatus } : prev,
                    )
                  }
                >
                  <option value="FOR_RENT">À louer</option>
                  <option value="FOR_SALE">À vendre</option>
                </select>
                <Input
                  type="number"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, price: event.target.value } : prev))
                  }
                  placeholder="Prix"
                />
                <Input
                  type="number"
                  value={formState.area}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, area: event.target.value } : prev))
                  }
                  placeholder="Surface"
                />
                <Input
                  value={formState.statusReason}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, statusReason: event.target.value } : prev,
                    )
                  }
                  placeholder="Motif (si statut modifié)"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={formState.street}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, street: event.target.value } : prev))
                  }
                  placeholder="Rue"
                />
                <Input
                  value={formState.city}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, city: event.target.value } : prev))
                  }
                  placeholder="Ville"
                />
                <Input
                  value={formState.province}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, province: event.target.value } : prev))
                  }
                  placeholder="Province"
                />
                <Input
                  value={formState.country}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, country: event.target.value } : prev))
                  }
                  placeholder="Pays"
                />
                <Input
                  value={formState.countryCode}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, countryCode: event.target.value } : prev))
                  }
                  placeholder="Code pays"
                />
                <Input
                  value={formState.contact}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, contact: event.target.value } : prev))
                  }
                  placeholder="Contact"
                />
              </div>

              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                value={formState.additionnalInformation}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, additionnalInformation: event.target.value } : prev,
                  )
                }
                placeholder="Informations additionnelles"
              />

              <Input
                value={formState.tagsRaw}
                onChange={(event) =>
                  setFormState((prev) => (prev ? { ...prev, tagsRaw: event.target.value } : prev))
                }
                placeholder="Tags (virgules)"
              />

              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  type="number"
                  value={formState.longitude}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, longitude: event.target.value } : prev))
                  }
                  placeholder="Longitude"
                />
                <Input
                  type="number"
                  value={formState.latitude}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, latitude: event.target.value } : prev))
                  }
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  value={formState.provinceLon}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, provinceLon: event.target.value } : prev))
                  }
                  placeholder="Province lon"
                />
                <Input
                  type="number"
                  value={formState.provinceLat}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, provinceLat: event.target.value } : prev))
                  }
                  placeholder="Province lat"
                />
                <Input
                  type="number"
                  value={formState.cityLon}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, cityLon: event.target.value } : prev))
                  }
                  placeholder="Ville lon"
                />
                <Input
                  type="number"
                  value={formState.cityLat}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, cityLat: event.target.value } : prev))
                  }
                  placeholder="Ville lat"
                />
                <Input
                  type="number"
                  value={formState.streetLon}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, streetLon: event.target.value } : prev))
                  }
                  placeholder="Rue lon"
                />
                <Input
                  type="number"
                  value={formState.streetLat}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, streetLat: event.target.value } : prev))
                  }
                  placeholder="Rue lat"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  type="number"
                  value={formState.nbrRooms}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrRooms: event.target.value } : prev))
                  }
                  placeholder="nbrRooms"
                />
                <Input
                  type="number"
                  value={formState.nbrKitchens}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrKitchens: event.target.value } : prev))
                  }
                  placeholder="nbrKitchens"
                />
                <Input
                  type="number"
                  value={formState.nbrBathrooms}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrBathrooms: event.target.value } : prev))
                  }
                  placeholder="nbrBathrooms"
                />
                <Input
                  type="number"
                  value={formState.nbrToilets}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrToilets: event.target.value } : prev))
                  }
                  placeholder="nbrToilets"
                />
                <Input
                  type="number"
                  value={formState.nbrGarages}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrGarages: event.target.value } : prev))
                  }
                  placeholder="nbrGarages"
                />
                <Input
                  type="number"
                  value={formState.nbrFloors}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrFloors: event.target.value } : prev))
                  }
                  placeholder="nbrFloors"
                />
                <Input
                  type="number"
                  value={formState.nbrLivingRoom}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrLivingRoom: event.target.value } : prev))
                  }
                  placeholder="nbrLivingRoom"
                />
                <Input
                  type="number"
                  value={formState.nbrFloorStudio}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrFloorStudio: event.target.value } : prev))
                  }
                  placeholder="nbrFloorStudio"
                />
                <Input
                  value={formState.numeroStudio}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, numeroStudio: event.target.value } : prev))
                  }
                  placeholder="numeroStudio"
                />
                <Input
                  type="number"
                  value={formState.nbrFloorApartment}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, nbrFloorApartment: event.target.value } : prev,
                    )
                  }
                  placeholder="nbrFloorApartment"
                />
                <Input
                  value={formState.numeroApartment}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev ? { ...prev, numeroApartment: event.target.value } : prev,
                    )
                  }
                  placeholder="numeroApartment"
                />
                <Input
                  type="number"
                  value={formState.nbrPiscine}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrPiscine: event.target.value } : prev))
                  }
                  placeholder="nbrPiscine"
                />
                <Input
                  type="number"
                  value={formState.nbrApartments}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrApartments: event.target.value } : prev))
                  }
                  placeholder="nbrApartments"
                />
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  value={formState.hasParking}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev
                        ? {
                            ...prev,
                            hasParking: event.target.value as "" | "true" | "false",
                          }
                        : prev,
                    )
                  }
                >
                  <option value="">hasParking non défini</option>
                  <option value="true">hasParking = true</option>
                  <option value="false">hasParking = false</option>
                </select>
                <Input
                  type="number"
                  value={formState.nbrToilet}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, nbrToilet: event.target.value } : prev))
                  }
                  placeholder="nbrToilet"
                />
                <Input
                  value={formState.kioskType}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, kioskType: event.target.value } : prev))
                  }
                  placeholder="kioskType"
                />
                <Input
                  value={formState.roomType}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, roomType: event.target.value } : prev))
                  }
                  placeholder="roomType"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-700">isLocExact</label>
                <input
                  type="checkbox"
                  checked={formState.isLocExact}
                  onChange={(event) =>
                    setFormState((prev) =>
                      prev
                        ? {
                            ...prev,
                            isLocExact: event.target.checked,
                          }
                        : prev,
                    )
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={!canUpdateListing || isSaving}>
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => listing && setFormState(toEditForm(listing))}
                >
                  Réinitialiser
                </Button>
              </div>
            </form>
          ) : null}

          {activeTab === "media" && listing && formState ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {listing.images.length ? (
                  listing.images.map((image, index) => (
                    <div key={`${image.fileURL}_${index}`} className="rounded-lg border border-slate-200 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.fileURL} alt={`media-${index}`} className="h-40 w-full rounded-md object-cover" />
                      <p className="mt-2 truncate text-xs text-slate-500">{image.fileURL}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Aucune image.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">URLs images (une par ligne)</label>
                <textarea
                  className="min-h-[200px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                  value={formState.imagesRaw}
                  onChange={(event) =>
                    setFormState((prev) => (prev ? { ...prev, imagesRaw: event.target.value } : prev))
                  }
                />
                <p className="mt-1 text-xs text-slate-500">Maximum 30 images.</p>
              </div>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Décisions modération</h3>
                <div className="space-y-2">
                  {moderationHistoryQuery.data?.decisions.length ? (
                    moderationHistoryQuery.data.decisions.map((decision) => (
                      <div key={decision.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-medium text-slate-900">
                          {decisionLabel(decision.decision)} • {toDateLabel(decision.createdAt)}
                        </p>
                        <p className="text-slate-700">Motif: {decision.reason}</p>
                        <p className="text-xs text-slate-500">
                          État {decision.beforeState ?? "N/A"} → {decision.afterState ?? "N/A"} | Statut {decision.beforeStatus ?? "N/A"} → {decision.afterStatus ?? "N/A"}
                        </p>
                        <p className="text-xs text-slate-500">Acteur: {decision.actorId}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucune décision de modération.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Audit technique</h3>
                <div className="space-y-2">
                  {moderationHistoryQuery.data?.auditLogs.length ? (
                    moderationHistoryQuery.data.auditLogs.map((audit) => (
                      <div key={audit.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-medium text-slate-900">
                          {audit.action} • {toDateLabel(audit.createdAt)}
                        </p>
                        <p className="text-xs text-slate-500">
                          status={audit.status ?? "N/A"} • actor={audit.actorId ?? "N/A"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucune entrée d&apos;audit visible.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "duplicates" ? (
            <div className="space-y-3">
              {!canReadDuplicates ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Permission manquante: listings.duplicates.read
                </div>
              ) : null}
              <p className="text-sm text-slate-700">
                Clusters contenant cette annonce: {duplicatesQuery.data?.count ?? 0}
              </p>
              {duplicatesQuery.data?.groups.length ? (
                duplicatesQuery.data.groups.map((group) => (
                  <div key={group.clusterId} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {duplicateReasonLabel(group.reason)} • confiance {group.confidence}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {group.resolution
                          ? `Traité: ${duplicateResolutionLabel(group.resolution.action)}`
                          : "En attente de traitement"}
                      </p>
                    </div>

                    <div className="mb-2 grid gap-2 md:grid-cols-2">
                      <Input
                        value={duplicateDecisionNoteByCluster[group.clusterId] ?? ""}
                        onChange={(event) =>
                          setDuplicateDecisionNoteByCluster((previous) => ({
                            ...previous,
                            [group.clusterId]: event.target.value,
                          }))
                        }
                        placeholder="Note de décision (optionnelle)"
                        disabled={!canResolveDuplicates || resolvingDuplicateClusterId === group.clusterId}
                      />
                      <select
                        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={duplicateTargetByCluster[group.clusterId] ?? ""}
                        onChange={(event) =>
                          setDuplicateTargetByCluster((previous) => ({
                            ...previous,
                            [group.clusterId]: event.target.value,
                          }))
                        }
                        disabled={!canResolveDuplicates || resolvingDuplicateClusterId === group.clusterId}
                      >
                        <option value="">Annonce de référence à conserver / cible à archiver</option>
                        {group.listings.map((item) => (
                          <option key={`${group.clusterId}_${item.id}`} value={item.id}>
                            {item.title} ({item.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canResolveDuplicates || resolvingDuplicateClusterId === group.clusterId}
                        onClick={() => void resolveDuplicateCluster(group.clusterId, "needs_review")}
                      >
                        Marquer à revoir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canResolveDuplicates || !canFinalizeDuplicates || resolvingDuplicateClusterId === group.clusterId}
                        onClick={() => void resolveDuplicateCluster(group.clusterId, "not_duplicate")}
                      >
                        Pas doublon
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canResolveDuplicates || !canFinalizeDuplicates || resolvingDuplicateClusterId === group.clusterId}
                        onClick={() => void resolveDuplicateCluster(group.clusterId, "confirm_duplicate")}
                      >
                        Confirmer doublon
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !canResolveDuplicates ||
                          !canFinalizeDuplicates ||
                          resolvingDuplicateClusterId === group.clusterId ||
                          !(duplicateTargetByCluster[group.clusterId] ?? "").trim()
                        }
                        onClick={() => void resolveDuplicateCluster(group.clusterId, "keep_one_archive_others")}
                      >
                        Conserver 1, archiver autres
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !canResolveDuplicates ||
                          !canFinalizeDuplicates ||
                          resolvingDuplicateClusterId === group.clusterId ||
                          !(duplicateTargetByCluster[group.clusterId] ?? "").trim()
                        }
                        onClick={() => void resolveDuplicateCluster(group.clusterId, "archive_target")}
                      >
                        Archiver cible
                      </Button>
                    </div>

                    {!canFinalizeDuplicates ? (
                      <p className="mb-2 text-xs text-amber-700">
                        Actions finales réservées à super_admin, operations_admin ou moderation_admin.
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      {group.listings.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-md px-2 py-1.5 text-xs ${
                            item.id === listingId ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"
                          }`}
                        >
                          {item.title} ({item.id}) • {statusLabel(item.status)} • {stateLabel(item.state)} • {formatMoney(item.price)}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800">
                          Archivées dans ce cluster:{" "}
                          {group.listings.filter((item) => item.state === "ARCHIVED").length}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={
                            !canHardDeleteListings ||
                            deletingDuplicateClusterId === group.clusterId ||
                            group.listings.every((item) => item.state !== "ARCHIVED")
                          }
                          onClick={() =>
                            void deleteAllArchivedDuplicateItems(
                              group.clusterId,
                              group.listings
                                .filter((item) => item.state === "ARCHIVED")
                                .map((item) => item.id),
                            )
                          }
                        >
                          Supprimer toutes les archivées
                        </Button>
                      </div>

                      <div className="mb-2">
                        <Input
                          value={duplicateHardDeleteReason}
                          onChange={(event) => setDuplicateHardDeleteReason(event.target.value)}
                          placeholder="Motif suppression définitive (min 10 caractères)"
                          disabled={!canHardDeleteListings || deletingDuplicateClusterId === group.clusterId}
                        />
                      </div>

                      {!canHardDeleteListings ? (
                        <p className="mb-2 text-[11px] text-amber-700">
                          Seul le super_admin peut supprimer définitivement les annonces archivées.
                        </p>
                      ) : null}

                      <div className="space-y-1.5">
                        {group.listings
                          .filter((item) => item.state === "ARCHIVED")
                          .map((item) => (
                            <div
                              key={`archived_${group.clusterId}_${item.id}`}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                            >
                              <p>
                                {item.title} ({item.id})
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={
                                  !canHardDeleteListings ||
                                  deletingDuplicateListingId === item.id ||
                                  deletingDuplicateClusterId === group.clusterId
                                }
                                onClick={() =>
                                  void deleteArchivedDuplicateItem(group.clusterId, item.id)
                                }
                              >
                                Supprimer définitivement
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucun doublon détecté pour cette annonce.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={reasonAction !== null} onOpenChange={(open) => (open ? undefined : closeReasonDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialogMeta.title}</DialogTitle>
            <DialogDescription>{reasonDialogMeta.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="listing-detail-reason" className="text-sm font-medium text-slate-700">
              Motif obligatoire
            </label>
            <Input
              id="listing-detail-reason"
              value={reasonDraft}
              onChange={(event) => setReasonDraft(event.target.value)}
              placeholder="Ex: vérification manuelle terminée"
              disabled={isSubmittingReason}
              autoFocus
            />
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
            <Button type="button" disabled={isSubmittingReason} onClick={() => void onConfirmReason()}>
              {reasonDialogMeta.confirmLabel || "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
