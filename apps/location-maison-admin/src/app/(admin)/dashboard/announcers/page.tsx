"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";
import { PROPERTY_TYPE_FIELD_RULES } from "@/modules/listing-management/domain/property-type-fields";
import { renderExtraTypeFields } from "@/modules/listing-management/presentation/property-type-fields-renderer";

type AnnouncerStatusFilter = "all" | "active" | "suspended" | "archived";
type AnnouncerPresenceFilter = "all" | "online" | "offline";

type AnnouncerListItem = {
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
  socialProfiles: AnnouncerSocialProfiles;
};

type AnnouncerListPayload = {
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
};

type AnnouncerDetails = {
  uid: string;
  docId: string;
  fullName: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  state: string | null;
  isSuspended: boolean;
  presenceStatus: "online" | "offline";
  lastSeenAt: string | null;
  announcerSinceAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  socialProfiles: AnnouncerSocialProfiles;
  metadata: Record<string, unknown> | null;
};

type AnnouncerDetailsPayload = {
  announcer: AnnouncerDetails;
};

type SocialNetworkKey = "facebook" | "instagram" | "tiktok" | "linkedin" | "x";

type SocialNetworkProfile = {
  url: string | null;
  handle: string | null;
};

type AnnouncerSocialProfiles = Record<SocialNetworkKey, SocialNetworkProfile | null>;

type AnnouncerSocialProfilesDraft = Record<SocialNetworkKey, { url: string; handle: string }>;

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type CreateAccountPayload = {
  uid: string;
  accountType: "user" | "announcer";
  email: string;
  roles: string[];
  emailVerified: true;
  phoneNumber: string;
};

type CreateListingPayload = {
  propertyId: string;
  announcerUid: string;
  typeProperty: string;
  status: "FOR_RENT" | "FOR_SALE";
  title: string;
};

type CreateAnnouncerFormState = {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phoneNumber: string;
  countryName: string;
  countryCode: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  credits: string;
};

type CreateListingFormState = {
  announcerUid: string;
  title: string;
  description: string;
  typeProperty:
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
  status: "FOR_RENT" | "FOR_SALE";
  price: string;
  area: string;
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  longitude: string;
  latitude: string;
  provinceLon: string;
  provinceLat: string;
  cityLon: string;
  cityLat: string;
  streetLon: string;
  streetLat: string;
  isLocExact: "true" | "false";
  contact: string;
  tagsRaw: string;
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
  hasParking: "true" | "false";
  nbrToilet: string;
  kioskType: string;
  roomType: string;
};

type ListingWizardStep = 1 | 2 | 3;

type LocalListingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadListingImagesPayload = {
  images: Array<{
    fileURL: string;
    filePATH: string;
  }>;
};

const MAX_LISTING_IMAGES = 10;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const PROPERTY_TYPE_OPTIONS: Array<{
  value: CreateListingFormState["typeProperty"];
  label: string;
}> = [
  { value: "Home", label: "Maison" },
  { value: "Studio", label: "Studio" },
  { value: "Apartment", label: "Appartement" },
  { value: "Desk", label: "Bureau" },
  { value: "Building", label: "Immeuble" },
  { value: "Shop", label: "Magasin" },
  { value: "Kiosk", label: "Kiosque" },
  { value: "Room", label: "Chambre" },
  { value: "Property", label: "Logement générique" },
  { value: "Logement", label: "Logement" },
  { value: "Villa", label: "Villa" },
  { value: "Land", label: "Terrain" },
];

const STATUS_OPTIONS: Array<{ value: "FOR_RENT" | "FOR_SALE"; label: string }> = [
  { value: "FOR_RENT", label: "À louer" },
  { value: "FOR_SALE", label: "À vendre" },
];

const PLATFORM_TAG_OPTIONS = [
  "Travail",
  "Famille",
  "Couple",
  "Villa",
  "Sous barrière",
  "Meublé",
  "Centre-ville",
  "Vacances",
  "Nature",
  "Montagne",
  "Piscine",
  "Animaux admis",
  "Commerces proches",
  "Transport proche",
  "Parking",
  "Wi-Fi",
  "Sécurisé",
  "Vélo",
  "Activités sportives",
  "Adapté aux enfants",
  "Accessible handicapés",
  "Étudiant",
  "Calme et tranquillité",
  "Proche de la plage",
  "Duplex",
  "Boutique",
  "Balcon",
  "Terrasse",
  "Collocation",
  "Garage",
  "Court séjour",
  "Propriétaire",
  "Agence",
] as const;

const SOCIAL_NETWORK_LABELS: Record<SocialNetworkKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
};

const SOCIAL_NETWORK_KEYS: SocialNetworkKey[] = ["facebook", "instagram", "tiktok", "linkedin", "x"];

function formatAnnouncerLookupLabel(announcer: {
  uid: string;
  fullName: string;
  email: string | null;
}) {
  return `${announcer.fullName}${announcer.email ? ` — ${announcer.email}` : ""} (${announcer.uid})`;
}

function createEmptySocialProfilesDraft(): AnnouncerSocialProfilesDraft {
  return SOCIAL_NETWORK_KEYS.reduce(
    (acc, key) => ({
      ...acc,
      [key]: { url: "", handle: "" },
    }),
    {} as AnnouncerSocialProfilesDraft,
  );
}

function toSocialProfilesDraft(source?: AnnouncerSocialProfiles | null): AnnouncerSocialProfilesDraft {
  const draft = createEmptySocialProfilesDraft();

  if (!source) {
    return draft;
  }

  for (const key of SOCIAL_NETWORK_KEYS) {
    draft[key] = {
      url: source[key]?.url ?? "",
      handle: source[key]?.handle ?? "",
    };
  }

  return draft;
}

function getAnnouncerSocialEntries(announcer: AnnouncerListItem) {
  return SOCIAL_NETWORK_KEYS.map((network) => ({
    network,
    label: SOCIAL_NETWORK_LABELS[network],
    url: announcer.socialProfiles[network]?.url ?? null,
    handle: announcer.socialProfiles[network]?.handle ?? null,
  })).filter((entry) => Boolean(entry.url) || Boolean(entry.handle));
}

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function toDateLabel(value?: string | null) {
  if (!value) {
    return "Jamais";
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

function splitTextList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function ensureMaxTags(tags: string[]) {
  return tags.slice(0, 6);
}

function isFiniteNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function isPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

async function fetchAnnouncersPage(
  filters: {
    query: string;
    status: AnnouncerStatusFilter;
    presence: AnnouncerPresenceFilter;
  },
  cursor: string | null,
) {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (cursor) params.set("cursor", cursor);
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.presence !== "all") params.set("presence", filters.presence);

  const response = await fetch(`/api/admin/v1/announcers?${params.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: AnnouncerListPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les annonceurs." : payload.error?.message);
  }

  return payload.data;
}

async function fetchAnnouncerDetails(uid: string) {
  const response = await fetch(`/api/admin/v1/announcers/${uid}`);
  const payload = (await response.json()) as
    | { success: true; data: AnnouncerDetailsPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger le détail annonceur." : payload.error?.message);
  }

  return payload.data.announcer;
}

async function patchAnnouncerSocialProfiles(uid: string, socialProfiles: AnnouncerSocialProfilesDraft) {
  const response = await fetch(`/api/admin/v1/announcers/${uid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      socialProfiles: SOCIAL_NETWORK_KEYS.reduce<
        Record<SocialNetworkKey, { url?: string; handle?: string } | null>
      >((acc, key) => {
        const url = socialProfiles[key].url.trim();
        const handle = socialProfiles[key].handle.trim();
        acc[key] = url || handle ? { ...(url ? { url } : {}), ...(handle ? { handle } : {}) } : null;
        return acc;
      }, {} as Record<SocialNetworkKey, { url?: string; handle?: string } | null>),
    }),
  });

  const payload = (await response.json()) as
    | { success: true; data: AnnouncerDetailsPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de mettre à jour les réseaux sociaux." : payload.error?.message);
  }

  return payload.data.announcer;
}

async function fetchMe() {
  const response = await fetch("/api/admin/v1/auth/me");
  const payload = (await response.json()) as
    | { success: true; data: AuthMePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les permissions." : payload.error?.message);
  }

  return payload.data;
}

function updateAnnouncerSocialProfilesInListCache(
  cached: InfiniteData<AnnouncerListPayload> | undefined,
  uid: string,
  socialProfiles: AnnouncerSocialProfiles,
) {
  if (!cached) {
    return cached;
  }

  return {
    ...cached,
    pages: cached.pages.map((page) => ({
      ...page,
      announcers: page.announcers.map((announcer) =>
        announcer.uid === uid
          ? {
              ...announcer,
              socialProfiles,
            }
          : announcer,
      ),
    })),
  };
}

function updateAnnouncerSuspensionInListCache(
  cached: InfiniteData<AnnouncerListPayload> | undefined,
  uid: string,
  isSuspended: boolean,
) {
  if (!cached) {
    return cached;
  }

  return {
    ...cached,
    pages: cached.pages.map((page) => ({
      ...page,
      announcers: page.announcers.map((announcer) =>
        announcer.uid === uid
          ? {
              ...announcer,
              isSuspended,
            }
          : announcer,
      ),
    })),
  };
}

export default function AnnouncersPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [status, setStatus] = useState<AnnouncerStatusFilter>("all");
  const [presence, setPresence] = useState<AnnouncerPresenceFilter>("all");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [showCreateAnnouncer, setShowCreateAnnouncer] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingStep, setListingStep] = useState<ListingWizardStep>(1);

  const [createAnnouncerSubmitting, setCreateAnnouncerSubmitting] = useState(false);
  const [createListingSubmitting, setCreateListingSubmitting] = useState(false);
  const [createAnnouncerError, setCreateAnnouncerError] = useState<string | null>(null);
  const [createListingError, setCreateListingError] = useState<string | null>(null);
  const [createAnnouncerResult, setCreateAnnouncerResult] = useState<CreateAccountPayload | null>(null);
  const [createListingResult, setCreateListingResult] = useState<CreateListingPayload | null>(null);
  const [socialProfilesDraft, setSocialProfilesDraft] = useState<AnnouncerSocialProfilesDraft>(
    createEmptySocialProfilesDraft(),
  );
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [socialActionError, setSocialActionError] = useState<string | null>(null);
  const [socialActionSuccess, setSocialActionSuccess] = useState<string | null>(null);

  const [createAnnouncer, setCreateAnnouncer] = useState<CreateAnnouncerFormState>({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phoneNumber: "",
    countryName: "Gabon",
    countryCode: "GA",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    credits: "3",
  });

  const [createListing, setCreateListing] = useState<CreateListingFormState>({
    announcerUid: "",
    title: "",
    description: "",
    typeProperty: "Home",
    status: "FOR_RENT",
    price: "0",
    area: "0",
    street: "",
    city: "",
    province: "",
    country: "Gabon",
    countryCode: "GA",
    longitude: "0",
    latitude: "0",
    provinceLon: "",
    provinceLat: "",
    cityLon: "",
    cityLat: "",
    streetLon: "",
    streetLat: "",
    isLocExact: "false",
    contact: "",
    tagsRaw: "",
    nbrRooms: "",
    nbrKitchens: "",
    nbrBathrooms: "",
    nbrToilets: "",
    nbrGarages: "",
    nbrFloors: "",
    nbrLivingRoom: "",
    nbrFloorStudio: "",
    numeroStudio: "",
    nbrFloorApartment: "",
    numeroApartment: "",
    nbrPiscine: "",
    nbrApartments: "",
    hasParking: "false",
    nbrToilet: "",
    kioskType: "",
    roomType: "",
  });
  const [createListingAnnouncerLookupInput, setCreateListingAnnouncerLookupInput] = useState("");
  const [createListingAnnouncerLookupDebounced, setCreateListingAnnouncerLookupDebounced] = useState("");
  const [showCreateListingAnnouncerLookup, setShowCreateListingAnnouncerLookup] = useState(false);

  const selectedListingTags = useMemo(
    () => ensureMaxTags(splitTextList(createListing.tagsRaw)),
    [createListing.tagsRaw],
  );
  const [listingLocalImages, setListingLocalImages] = useState<LocalListingImage[]>([]);
  const listingLocalImagesRef = useRef<LocalListingImage[]>([]);
  const didHydrateCreateListingFromQueryRef = useRef(false);

  useEffect(() => {
    listingLocalImagesRef.current = listingLocalImages;
  }, [listingLocalImages]);

  useEffect(
    () => () => {
      for (const image of listingLocalImagesRef.current) {
        URL.revokeObjectURL(image.previewUrl);
      }
    },
    [],
  );

  const announcersQuery = useInfiniteQuery({
    queryKey: ["announcers", "list", queryApplied, status, presence],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchAnnouncersPage(
        {
          query: queryApplied,
          status,
          presence,
        },
        (pageParam ?? null) as string | null,
      ),
    getNextPageParam: (lastPage) => (lastPage.page.hasMore ? lastPage.page.nextCursor : undefined),
  });

  const detailsQuery = useQuery({
    queryKey: ["announcers", "details", selectedUid],
    queryFn: () => fetchAnnouncerDetails(selectedUid as string),
    enabled: Boolean(selectedUid),
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset volontaire du brouillon social quand l'annonceur affiché change */
    if (!detailsQuery.data) {
      setSocialProfilesDraft(createEmptySocialProfilesDraft());
      setSocialActionError(null);
      setSocialActionSuccess(null);
      return;
    }

    setSocialProfilesDraft(toSocialProfilesDraft(detailsQuery.data.socialProfiles));
    setSocialActionError(null);
    setSocialActionSuccess(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [detailsQuery.data]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset volontaire du brouillon quand la sélection est vidée */
    if (!selectedUid) {
      setSocialProfilesDraft(createEmptySocialProfilesDraft());
      setSocialActionError(null);
      setSocialActionSuccess(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedUid]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCreateListingAnnouncerLookupDebounced(createListingAnnouncerLookupInput.trim());
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [createListingAnnouncerLookupInput]);

  const permissions = useMemo(
    () => meQuery.data?.admin.permissions ?? [],
    [meQuery.data?.admin.permissions],
  );
  const canUpdateAnnouncer = useMemo(
    () => hasPermission(permissions, "announcers.update"),
    [permissions],
  );
  const canCreateAnnouncer = useMemo(
    () => hasPermission(permissions, "announcers.create"),
    [permissions],
  );
  const canCreateListing = useMemo(() => hasPermission(permissions, "listings.create"), [permissions]);
  const createListingAnnouncerLookupQuery = useQuery({
    queryKey: ["announcers", "create-listing", "lookup", createListingAnnouncerLookupDebounced],
    enabled: canCreateListing && showCreateListing && createListingAnnouncerLookupDebounced.length >= 2,
    queryFn: () =>
      fetchAnnouncersPage(
        {
          query: createListingAnnouncerLookupDebounced,
          status: "all",
          presence: "all",
        },
        null,
      ),
  });

  const pages = announcersQuery.data?.pages ?? [];
  const safePageIndex = Math.min(currentPageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] ?? null;
  const announcers = currentPage?.announcers ?? [];
  const hasPrevious = safePageIndex > 0;
  const hasNextLoaded = safePageIndex < pages.length - 1;
  const hasNextRemote = currentPage?.page.hasMore ?? false;

  const totalCountLabel =
    pages.length > 0 && pages[0].totalCount !== null ? String(pages[0].totalCount) : "?";
  const createListingAnnouncerLookupResults = createListingAnnouncerLookupQuery.data?.announcers ?? [];

  const stats = {
    loadedCount: announcers.length,
    onlineCount: announcers.filter((announcer) => announcer.presenceStatus === "online").length,
    offlineCount: announcers.filter((announcer) => announcer.presenceStatus === "offline").length,
    suspendedCount: announcers.filter((announcer) => announcer.isSuspended).length,
  };

  const loading = announcersQuery.isLoading || meQuery.isLoading;
  const error = actionError ?? announcersQuery.error?.message ?? meQuery.error?.message ?? null;

  const onSearch = useCallback(() => {
    setQueryApplied(queryDraft.trim());
    setCurrentPageIndex(0);
  }, [queryDraft]);

  const onResetFilters = useCallback(() => {
    setQueryDraft("");
    setQueryApplied("");
    setStatus("all");
    setPresence("all");
    setCurrentPageIndex(0);
  }, []);

  const onPreviousPage = useCallback(() => {
    setCurrentPageIndex((index) => Math.max(0, index - 1));
  }, []);

  const onNextPage = useCallback(async () => {
    if (safePageIndex < pages.length - 1) {
      setCurrentPageIndex((index) => index + 1);
      return;
    }

    if (!hasNextRemote) {
      return;
    }

    const previousLength = pages.length;
    const result = await announcersQuery.fetchNextPage();
    const nextLength = result.data?.pages?.length ?? previousLength;
    if (nextLength > previousLength) {
      setCurrentPageIndex((index) => index + 1);
    }
  }, [announcersQuery, hasNextRemote, pages.length, safePageIndex]);

  const onExportCsv = useCallback(() => {
    const params = new URLSearchParams();
    if (queryApplied) params.set("query", queryApplied);
    if (status !== "all") params.set("status", status);
    if (presence !== "all") params.set("presence", presence);
    window.open(
      `/api/admin/v1/announcers/export?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [presence, queryApplied, status]);

  const onToggleSuspension = useCallback(
    async (announcer: AnnouncerListItem) => {
      const targetStatus = announcer.isSuspended ? "active" : "suspended";
      const nextIsSuspended = targetStatus === "suspended";
      setSubmitting(true);
      setActionError(null);
      try {
        const response = await fetch(`/api/admin/v1/announcers/${announcer.uid}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: targetStatus,
          }),
        });
        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Action impossible." : payload.error?.message);
        }

        queryClient.setQueriesData<InfiniteData<AnnouncerListPayload>>(
          { queryKey: ["announcers", "list"] },
          (cached) =>
            updateAnnouncerSuspensionInListCache(
              cached,
              announcer.uid,
              nextIsSuspended,
            ),
        );
        if (selectedUid === announcer.uid) {
          queryClient.setQueryData<AnnouncerDetailsPayload>(
            ["announcers", "details", selectedUid],
            (cached) =>
              cached
                ? {
                    announcer: {
                      ...cached.announcer,
                      isSuspended: nextIsSuspended,
                    },
                  }
                : cached,
          );
        }

        await announcersQuery.refetch();
        if (selectedUid === announcer.uid) {
          await detailsQuery.refetch();
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action impossible.");
      } finally {
        setSubmitting(false);
      }
    },
    [announcersQuery, detailsQuery, queryClient, selectedUid],
  );

  const onChangeSocialField = useCallback(
    (network: SocialNetworkKey, field: "url" | "handle", value: string) => {
      setSocialProfilesDraft((previous) => ({
        ...previous,
        [network]: {
          ...previous[network],
          [field]: value,
        },
      }));
      setSocialActionError(null);
      setSocialActionSuccess(null);
    },
    [],
  );

  const onSaveSocialProfiles = useCallback(async () => {
    if (!selectedUid) {
      return;
    }
    if (!canUpdateAnnouncer) {
      setSocialActionError("Permission manquante : announcers.update");
      return;
    }

    setSocialSubmitting(true);
    setSocialActionError(null);
    setSocialActionSuccess(null);

    try {
      const updatedAnnouncer = await patchAnnouncerSocialProfiles(selectedUid, socialProfilesDraft);

      queryClient.setQueryData<AnnouncerDetailsPayload>(
        ["announcers", "details", selectedUid],
        { announcer: updatedAnnouncer },
      );
      queryClient.setQueriesData<InfiniteData<AnnouncerListPayload>>(
        { queryKey: ["announcers", "list"] },
        (cached) =>
          updateAnnouncerSocialProfilesInListCache(
            cached,
            updatedAnnouncer.uid,
            updatedAnnouncer.socialProfiles,
          ),
      );
      setSocialProfilesDraft(toSocialProfilesDraft(updatedAnnouncer.socialProfiles));

      await Promise.all([detailsQuery.refetch(), announcersQuery.refetch()]);
      setSocialActionSuccess("Réseaux sociaux mis à jour.");
    } catch (error) {
      setSocialActionError(
        error instanceof Error ? error.message : "Impossible de mettre à jour les réseaux sociaux.",
      );
    } finally {
      setSocialSubmitting(false);
    }
  }, [announcersQuery, canUpdateAnnouncer, detailsQuery, queryClient, selectedUid, socialProfilesDraft]);

  const onCreateAnnouncerAccount = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canCreateAnnouncer) {
        setCreateAnnouncerError("Permission manquante : announcers.create");
        return;
      }

      setCreateAnnouncerSubmitting(true);
      setCreateAnnouncerError(null);
      setCreateAnnouncerResult(null);

      try {
        const response = await fetch("/api/admin/v1/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountType: "announcer",
            firstname: createAnnouncer.firstname,
            lastname: createAnnouncer.lastname,
            email: createAnnouncer.email,
            password: createAnnouncer.password,
            passwordConfirm: createAnnouncer.passwordConfirm,
            phoneNumber: createAnnouncer.phoneNumber,
            country: {
              name: createAnnouncer.countryName,
              code: createAnnouncer.countryCode,
            },
            birthdate:
              createAnnouncer.birthDay && createAnnouncer.birthMonth && createAnnouncer.birthYear
                ? {
                    day: createAnnouncer.birthDay,
                    month: createAnnouncer.birthMonth,
                    year: createAnnouncer.birthYear,
                  }
                : undefined,
            credits: createAnnouncer.credits ? Number(createAnnouncer.credits) : undefined,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: CreateAccountPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer l'annonceur." : payload.error?.message);
        }

        setCreateAnnouncerResult(payload.data);
        setSelectedUid(payload.data.uid);
        setCreateListing((previous) => ({
          ...previous,
          announcerUid: payload.data.uid,
          contact: payload.data.phoneNumber,
        }));
        setCreateListingAnnouncerLookupInput(payload.data.uid);

        await announcersQuery.refetch();
      } catch (error) {
        setCreateAnnouncerError(
          error instanceof Error ? error.message : "Impossible de créer l'annonceur.",
        );
      } finally {
        setCreateAnnouncerSubmitting(false);
      }
    },
    [announcersQuery, canCreateAnnouncer, createAnnouncer],
  );

  const clearListingLocalImages = useCallback(() => {
    setListingLocalImages((previous) => {
      for (const image of previous) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return [];
    });
  }, []);

  const onPickListingImages = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      if (selectedFiles.length === 0) {
        return;
      }

      setCreateListingError(null);

      const invalidTypeCount = selectedFiles.filter((file) => !ACCEPTED_IMAGE_TYPES.has(file.type)).length;
      if (invalidTypeCount > 0) {
        setCreateListingError("Formats autorisés: JPG, PNG, WEBP.");
      }

      const accepted = selectedFiles.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type));
      setListingLocalImages((previous) => {
        const availableSlots = Math.max(MAX_LISTING_IMAGES - previous.length, 0);
        if (availableSlots === 0) {
          return previous;
        }

        const toAdd = accepted.slice(0, availableSlots).map((file, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));

        return [...previous, ...toAdd];
      });

      event.target.value = "";
    },
    [],
  );

  const onRemoveListingImage = useCallback((id: string) => {
    setListingLocalImages((previous) => {
      const target = previous.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((image) => image.id !== id);
    });
  }, []);

  const onSelectCreateListingAnnouncer = useCallback((announcer: AnnouncerListItem) => {
    setSelectedUid(announcer.uid);
    setCreateListing((previous) => ({
      ...previous,
      announcerUid: announcer.uid,
      contact: announcer.phoneNumbers[0] ?? previous.contact,
    }));
    setCreateListingAnnouncerLookupInput(formatAnnouncerLookupLabel(announcer));
    setShowCreateListingAnnouncerLookup(false);
  }, []);

  const openCreateListingPanel = useCallback(
    (announcerUid?: string | null) => {
      setShowCreateListing(true);
      setShowCreateAnnouncer(false);
      setListingStep(1);
      setCreateListingError(null);
      setCreateListingResult(null);
      clearListingLocalImages();

      const normalizedUid = announcerUid?.trim();
      if (normalizedUid) {
        setSelectedUid(normalizedUid);
        setCreateListing((previous) => ({
          ...previous,
          announcerUid: normalizedUid,
        }));
        const fromCurrentPages = pages
          .flatMap((page) => page.announcers)
          .find((announcer) => announcer.uid === normalizedUid);
        if (fromCurrentPages) {
          setCreateListingAnnouncerLookupInput(formatAnnouncerLookupLabel(fromCurrentPages));
        } else {
          setCreateListingAnnouncerLookupInput(normalizedUid);
        }
      } else {
        setCreateListingAnnouncerLookupInput("");
      }
    },
    [clearListingLocalImages, pages],
  );

  useEffect(() => {
    const shouldOpenCreateListing = searchParams.get("createListing") === "1";
    const announcerUidFromQuery = searchParams.get("announcerUid");

    if (!shouldOpenCreateListing) {
      didHydrateCreateListingFromQueryRef.current = false;
      return;
    }
    if (didHydrateCreateListingFromQueryRef.current) {
      return;
    }

    didHydrateCreateListingFromQueryRef.current = true;
    openCreateListingPanel(announcerUidFromQuery);
  }, [openCreateListingPanel, searchParams]);

  const uploadListingImages = useCallback(async (): Promise<UploadListingImagesPayload["images"]> => {
    const formData = new FormData();
    formData.set("announcerUid", createListing.announcerUid);

    for (const image of listingLocalImages) {
      formData.append("files", image.file, image.file.name);
    }

    const response = await fetch("/api/admin/v1/listings/images/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as
      | { success: true; data: UploadListingImagesPayload }
      | { success: false; error?: { message?: string } };

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.success ? "Impossible d'envoyer les images." : payload.error?.message ?? "Upload image impossible.",
      );
    }

    return payload.data.images;
  }, [createListing.announcerUid, listingLocalImages]);

  const validateListingStep1 = useCallback(() => {
    if (!createListing.announcerUid.trim()) {
      return "UID annonceur requis.";
    }
    if (createListing.title.trim().length < 3) {
      return "Le titre doit contenir au moins 3 caractères.";
    }
    if (createListing.description.trim().length < 10) {
      return "La description doit contenir au moins 10 caractères.";
    }
    if (!isPositiveNumber(createListing.price)) {
      return "Le prix doit être supérieur à 0.";
    }
    if (!isNonNegativeNumber(createListing.area)) {
      return "La surface doit être un nombre positif ou nul.";
    }
    if (selectedListingTags.length < 1) {
      return "Ajoute au moins 1 tag (maximum 6).";
    }

    const sourceTags = splitTextList(createListing.tagsRaw);
    if (sourceTags.length > 6) {
      return "Maximum 6 tags comme dans property/add.";
    }

    if (listingLocalImages.length < 1) {
      return "Ajoute au moins 1 image.";
    }
    if (listingLocalImages.length > MAX_LISTING_IMAGES) {
      return "Maximum 10 images comme dans property/add.";
    }

    return null;
  }, [createListing, listingLocalImages.length, selectedListingTags.length]);

  const validateListingStep2 = useCallback(() => {
    const rules = PROPERTY_TYPE_FIELD_RULES[createListing.typeProperty] ?? [];

    for (const rule of rules) {
      const value = (createListing as Record<string, string>)[rule.key];

      if (rule.kind === "number" && !isFiniteNumber(value)) {
        return `${rule.label} est requis pour ce type d'annonce.`;
      }
      if (rule.kind === "string" && !value?.trim()) {
        return `${rule.label} est requis pour ce type d'annonce.`;
      }
      if (rule.kind === "boolean" && value !== "true" && value !== "false") {
        return `${rule.label} est requis pour ce type d'annonce.`;
      }
    }

    return null;
  }, [createListing]);

  const validateListingStep3 = useCallback(() => {
    if (!createListing.province.trim()) return "La province est requise.";
    if (!createListing.city.trim()) return "La ville est requise.";
    if (!createListing.street.trim()) return "Le quartier est requis.";
    if (!createListing.country.trim()) return "Le pays est requis.";
    if (createListing.countryCode.trim().length < 2) return "Le code pays est requis.";
    if (!isFiniteNumber(createListing.longitude)) return "La longitude est requise.";
    if (!isFiniteNumber(createListing.latitude)) return "La latitude est requise.";
    return null;
  }, [createListing]);

  const onToggleListingTag = useCallback(
    (tag: string) => {
      const exists = selectedListingTags.includes(tag);
      const next = exists
        ? selectedListingTags.filter((item) => item !== tag)
        : ensureMaxTags([...selectedListingTags, tag]);

      setCreateListing((previous) => ({
        ...previous,
        tagsRaw: next.join(", "),
      }));
    },
    [selectedListingTags],
  );

  const onNextListingStep = useCallback(() => {
    setCreateListingError(null);

    if (listingStep === 1) {
      const errorMessage = validateListingStep1();
      if (errorMessage) {
        setCreateListingError(errorMessage);
        return;
      }
      setListingStep(2);
      return;
    }

    if (listingStep === 2) {
      const errorMessage = validateListingStep2();
      if (errorMessage) {
        setCreateListingError(errorMessage);
        return;
      }
      setListingStep(3);
    }
  }, [listingStep, validateListingStep1, validateListingStep2]);

  const onPreviousListingStep = useCallback(() => {
    setCreateListingError(null);
    setListingStep((previous) => (previous > 1 ? ((previous - 1) as ListingWizardStep) : previous));
  }, []);

  const onCreateListingForAnnouncer = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canCreateListing) {
        setCreateListingError("Permission manquante : listings.create");
        return;
      }

      setCreateListingSubmitting(true);
      setCreateListingError(null);
      setCreateListingResult(null);

      try {
        const step1Error = validateListingStep1();
        if (step1Error) {
          throw new Error(step1Error);
        }

        const step2Error = validateListingStep2();
        if (step2Error) {
          throw new Error(step2Error);
        }

        const step3Error = validateListingStep3();
        if (step3Error) {
          throw new Error(step3Error);
        }

        const tags = selectedListingTags;
        const uploadedImages = await uploadListingImages();

        const response = await fetch("/api/admin/v1/listings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            announcerUid: createListing.announcerUid,
            title: createListing.title,
            description: createListing.description,
            typeProperty: createListing.typeProperty,
            status: createListing.status,
            price: Number(createListing.price),
            area: Number(createListing.area),
            street: createListing.street,
            city: createListing.city,
            province: createListing.province,
            country: createListing.country,
            countryCode: createListing.countryCode,
            longitude: toOptionalNumber(createListing.longitude),
            latitude: toOptionalNumber(createListing.latitude),
            provinceLon: toOptionalNumber(createListing.provinceLon),
            provinceLat: toOptionalNumber(createListing.provinceLat),
            cityLon: toOptionalNumber(createListing.cityLon),
            cityLat: toOptionalNumber(createListing.cityLat),
            streetLon: toOptionalNumber(createListing.streetLon),
            streetLat: toOptionalNumber(createListing.streetLat),
            isLocExact: createListing.isLocExact === "true",
            contact: createListing.contact || undefined,
            tags,
            images: uploadedImages,
            nbrRooms: toOptionalNumber(createListing.nbrRooms),
            nbrKitchens: toOptionalNumber(createListing.nbrKitchens),
            nbrBathrooms: toOptionalNumber(createListing.nbrBathrooms),
            nbrToilets: toOptionalNumber(createListing.nbrToilets),
            nbrGarages: toOptionalNumber(createListing.nbrGarages),
            nbrFloors: toOptionalNumber(createListing.nbrFloors),
            nbrLivingRoom: toOptionalNumber(createListing.nbrLivingRoom),
            nbrFloorStudio: toOptionalNumber(createListing.nbrFloorStudio),
            numeroStudio: createListing.numeroStudio || undefined,
            nbrFloorApartment: toOptionalNumber(createListing.nbrFloorApartment),
            numeroApartment: createListing.numeroApartment || undefined,
            nbrPiscine: toOptionalNumber(createListing.nbrPiscine),
            nbrApartments: toOptionalNumber(createListing.nbrApartments),
            hasParking: createListing.hasParking === "true",
            nbrToilet: toOptionalNumber(createListing.nbrToilet),
            kioskType: createListing.kioskType || undefined,
            roomType: createListing.roomType || undefined,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: CreateListingPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer l'annonce." : payload.error?.message);
        }

        setCreateListingResult(payload.data);
        setListingStep(1);
        clearListingLocalImages();
      } catch (error) {
        setCreateListingError(error instanceof Error ? error.message : "Impossible de créer l'annonce.");
      } finally {
        setCreateListingSubmitting(false);
      }
    },
    [
      canCreateListing,
      createListing,
      clearListingLocalImages,
      selectedListingTags,
      uploadListingImages,
      validateListingStep1,
      validateListingStep2,
      validateListingStep3,
    ],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annonceurs"
        description="Consultation des comptes annonceurs, présence et statut opérationnel."
        actions={
          <>
            {canCreateAnnouncer ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateAnnouncer((value) => !value)}
              >
                {showCreateAnnouncer ? "Fermer création" : "Nouveau annonceur"}
              </Button>
            ) : null}
            {canCreateListing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const targetUid = createListing.announcerUid || selectedUid || "";
                  const params = new URLSearchParams();
                  if (targetUid) {
                    params.set("announcerUid", targetUid);
                  }
                  window.location.assign(
                    params.toString()
                      ? `/dashboard/listings/new?${params.toString()}`
                      : "/dashboard/listings/new",
                  );
                }}
              >
                Nouvelle annonce
              </Button>
            ) : null}
          </>
        }
      />

      {showCreateAnnouncer ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Créer un compte annonceur</h2>
            <p className="text-sm text-slate-600">Crée un compte `Announcer` avec email vérifié.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(event) => void onCreateAnnouncerAccount(event)}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={createAnnouncer.firstname}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      firstname: event.target.value,
                    }))
                  }
                  placeholder="Prénom"
                  disabled={createAnnouncerSubmitting || loading}
                />
                <Input
                  value={createAnnouncer.lastname}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      lastname: event.target.value,
                    }))
                  }
                  placeholder="Nom"
                  disabled={createAnnouncerSubmitting || loading}
                />
              </div>

              <Input
                type="email"
                value={createAnnouncer.email}
                onChange={(event) =>
                  setCreateAnnouncer((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
                disabled={createAnnouncerSubmitting || loading}
              />

              <Input
                type="password"
                value={createAnnouncer.password}
                onChange={(event) =>
                  setCreateAnnouncer((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                placeholder="Mot de passe (8+ caractères, 1 majuscule, 1 chiffre)"
                disabled={createAnnouncerSubmitting || loading}
              />

              <Input
                type="password"
                value={createAnnouncer.passwordConfirm}
                onChange={(event) =>
                  setCreateAnnouncer((previous) => ({
                    ...previous,
                    passwordConfirm: event.target.value,
                  }))
                }
                placeholder="Confirmer le mot de passe"
                disabled={createAnnouncerSubmitting || loading}
              />

              <Input
                value={createAnnouncer.phoneNumber}
                onChange={(event) =>
                  setCreateAnnouncer((previous) => ({
                    ...previous,
                    phoneNumber: event.target.value,
                  }))
                }
                placeholder="Téléphone (ex: +24177682457)"
                disabled={createAnnouncerSubmitting || loading}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={createAnnouncer.countryName}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      countryName: event.target.value,
                    }))
                  }
                  placeholder="Pays"
                  disabled={createAnnouncerSubmitting || loading}
                />
                <Input
                  value={createAnnouncer.countryCode}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      countryCode: event.target.value,
                    }))
                  }
                  placeholder="Code pays"
                  disabled={createAnnouncerSubmitting || loading}
                />
                <Input
                  value={createAnnouncer.credits}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      credits: event.target.value,
                    }))
                  }
                  placeholder="Crédits initiaux"
                  disabled={createAnnouncerSubmitting || loading}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={createAnnouncer.birthDay}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      birthDay: event.target.value,
                    }))
                  }
                  placeholder="Jour (JJ)"
                  disabled={createAnnouncerSubmitting || loading}
                />
                <Input
                  value={createAnnouncer.birthMonth}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      birthMonth: event.target.value,
                    }))
                  }
                  placeholder="Mois (MM)"
                  disabled={createAnnouncerSubmitting || loading}
                />
                <Input
                  value={createAnnouncer.birthYear}
                  onChange={(event) =>
                    setCreateAnnouncer((previous) => ({
                      ...previous,
                      birthYear: event.target.value,
                    }))
                  }
                  placeholder="Année (AAAA)"
                  disabled={createAnnouncerSubmitting || loading}
                />
              </div>

              {createAnnouncerError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createAnnouncerError}
                </p>
              ) : null}

              {createAnnouncerResult ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Compte créé: UID <span className="font-mono">{createAnnouncerResult.uid}</span> - Roles{" "}
                  <span className="font-mono">{createAnnouncerResult.roles.join(", ")}</span>
                </p>
              ) : null}

              <Button type="submit" disabled={createAnnouncerSubmitting || loading}>
                {createAnnouncerSubmitting ? "Création en cours..." : "Créer annonceur"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showCreateListing ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Créer une annonce</h2>
            <p className="text-sm text-slate-600">Ajoute une annonce au compte annonceur ciblé.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void onCreateListingForAnnouncer(event)}>
              <div className="grid gap-2 md:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    listingStep === 1 ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300"
                  }`}
                  onClick={() => setListingStep(1)}
                >
                  Étape 1: Infos générales
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    listingStep === 2 ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300"
                  }`}
                  onClick={() => {
                    if (listingStep >= 2) setListingStep(2);
                  }}
                >
                  Étape 2: Attributs du type
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    listingStep === 3 ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300"
                  }`}
                  onClick={() => {
                    if (listingStep >= 3) setListingStep(3);
                  }}
                >
                  Étape 3: Localisation
                </button>
              </div>

              {listingStep === 1 ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Recherche annonceur</p>
                    <Input
                      value={createListingAnnouncerLookupInput}
                      onChange={(event) => {
                        setCreateListingAnnouncerLookupInput(event.target.value);
                        setShowCreateListingAnnouncerLookup(true);
                      }}
                      onFocus={() => setShowCreateListingAnnouncerLookup(true)}
                      placeholder="Recherche annonceur (nom, email, UID)"
                      disabled={createListingSubmitting || loading}
                      autoComplete="off"
                    />
                  </div>
                  {showCreateListingAnnouncerLookup && createListingAnnouncerLookupInput.trim().length >= 2 ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
                      {createListingAnnouncerLookupQuery.isFetching ? (
                        <p className="px-2 py-1 text-slate-500">Recherche des annonceurs...</p>
                      ) : createListingAnnouncerLookupQuery.error ? (
                        <p className="px-2 py-1 text-red-700">{createListingAnnouncerLookupQuery.error.message}</p>
                      ) : createListingAnnouncerLookupResults.length ? (
                        <div className="max-h-56 space-y-1 overflow-y-auto">
                          {createListingAnnouncerLookupResults.map((announcer) => (
                            <button
                              key={`listing-lookup-${announcer.uid}`}
                              type="button"
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                              onClick={() => onSelectCreateListingAnnouncer(announcer)}
                              disabled={createListingSubmitting || loading}
                            >
                              <p className="font-medium text-slate-900">{announcer.fullName}</p>
                              <p className="text-xs text-slate-500">
                                {announcer.email ?? "Email N/A"} · {announcer.uid}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-1 text-slate-500">Aucun annonceur trouvé.</p>
                      )}
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">UID annonceur sélectionné</p>
                    <Input
                      value={createListing.announcerUid}
                      readOnly
                      placeholder="UID annonceur sélectionné"
                      disabled
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Titre de l&apos;annonce</p>
                      <Input
                        value={createListing.title}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Titre"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Type de bien</p>
                      <select
                        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={createListing.typeProperty}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            typeProperty: event.target.value as CreateListingFormState["typeProperty"],
                          }))
                        }
                        disabled={createListingSubmitting || loading}
                      >
                        {PROPERTY_TYPE_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Description</p>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={createListing.description}
                      onChange={(event) =>
                        setCreateListing((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Description"
                      disabled={createListingSubmitting || loading}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Statut annonce</p>
                      <select
                        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={createListing.status}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            status: event.target.value as "FOR_RENT" | "FOR_SALE",
                          }))
                        }
                        disabled={createListingSubmitting || loading}
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Prix</p>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={createListing.price}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            price: event.target.value,
                          }))
                        }
                        placeholder="Prix"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Superficie (m²)</p>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={createListing.area}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            area: event.target.value,
                          }))
                        }
                        placeholder="Surface (m²)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      Tags ({selectedListingTags.length}/6) - même logique que property/add
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_TAG_OPTIONS.map((tag) => {
                        const isActive = selectedListingTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs ${
                              isActive
                                ? "border-emerald-700 bg-emerald-100 text-emerald-800"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                            onClick={() => onToggleListingTag(tag)}
                            disabled={createListingSubmitting || loading}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Saisie manuelle des tags</p>
                      <textarea
                        className="min-h-16 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                        value={createListing.tagsRaw}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            tagsRaw: event.target.value,
                          }))
                        }
                        placeholder="Tags (séparés par virgule ou retour ligne)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        Images ({listingLocalImages.length}/{MAX_LISTING_IMAGES}) - style property/add
                      </p>
                      {listingLocalImages.length > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={clearListingLocalImages}
                          disabled={createListingSubmitting || loading}
                        >
                          Tout supprimer
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Ajouter des images</p>
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={onPickListingImages}
                        disabled={createListingSubmitting || loading || listingLocalImages.length >= MAX_LISTING_IMAGES}
                      />
                    </div>

                    {listingLocalImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {listingLocalImages.map((image) => (
                          <div key={image.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <Image
                              src={image.previewUrl}
                              alt={image.file.name}
                              width={320}
                              height={160}
                              unoptimized
                              className="h-24 w-full object-cover"
                            />
                            <div className="space-y-1 px-2 py-2">
                              <p className="truncate text-[11px] text-slate-700">{image.file.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {(image.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 w-full px-2 text-[10px]"
                                onClick={() => onRemoveListingImage(image.id)}
                                disabled={createListingSubmitting || loading}
                              >
                                Retirer
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Ajoute entre 1 et 10 images JPG/PNG/WEBP.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {listingStep === 2 ? (
                <div className="space-y-3">
                  {renderExtraTypeFields(
                    createListing.typeProperty,
                    createListing,
                    setCreateListing,
                    createListingSubmitting || loading,
                    "labeled",
                  )}
                </div>
              ) : null}

              {listingStep === 3 ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Province</p>
                      <Input
                        value={createListing.province}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            province: event.target.value,
                          }))
                        }
                        placeholder="Province"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Ville</p>
                      <Input
                        value={createListing.city}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            city: event.target.value,
                          }))
                        }
                        placeholder="Ville"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Quartier / District</p>
                      <Input
                        value={createListing.street}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            street: event.target.value,
                          }))
                        }
                        placeholder="Quartier (district)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Pays</p>
                      <Input
                        value={createListing.country}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            country: event.target.value,
                          }))
                        }
                        placeholder="Pays"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Code pays</p>
                      <Input
                        value={createListing.countryCode}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            countryCode: event.target.value,
                          }))
                        }
                        placeholder="Code pays"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Longitude</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.longitude}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            longitude: event.target.value,
                          }))
                        }
                        placeholder="Longitude"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Latitude</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.latitude}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            latitude: event.target.value,
                          }))
                        }
                        placeholder="Latitude"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Contact (optionnel)</p>
                      <Input
                        value={createListing.contact}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            contact: event.target.value,
                          }))
                        }
                        placeholder="Contact (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Province Lon (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.provinceLon}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            provinceLon: event.target.value,
                          }))
                        }
                        placeholder="Province Lon (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Province Lat (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.provinceLat}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            provinceLat: event.target.value,
                          }))
                        }
                        placeholder="Province Lat (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">City Lon (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.cityLon}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            cityLon: event.target.value,
                          }))
                        }
                        placeholder="City Lon (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">City Lat (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.cityLat}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            cityLat: event.target.value,
                          }))
                        }
                        placeholder="City Lat (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Street Lon (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.streetLon}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            streetLon: event.target.value,
                          }))
                        }
                        placeholder="Street Lon (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Street Lat (optionnel)</p>
                      <Input
                        type="number"
                        step="any"
                        value={createListing.streetLat}
                        onChange={(event) =>
                          setCreateListing((previous) => ({
                            ...previous,
                            streetLat: event.target.value,
                          }))
                        }
                        placeholder="Street Lat (optionnel)"
                        disabled={createListingSubmitting || loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Précision de la position</p>
                    <select
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                      value={createListing.isLocExact}
                      onChange={(event) =>
                        setCreateListing((previous) => ({
                          ...previous,
                          isLocExact: event.target.value as "true" | "false",
                        }))
                      }
                      disabled={createListingSubmitting || loading}
                    >
                      <option value="false">Position approximative</option>
                      <option value="true">Position exacte</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {createListingError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{createListingError}</p>
              ) : null}

              {createListingResult ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Annonce créée: ID <span className="font-mono">{createListingResult.propertyId}</span>
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                {listingStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPreviousListingStep}
                    disabled={createListingSubmitting || loading}
                  >
                    Précédent
                  </Button>
                ) : null}

                {listingStep < 3 ? (
                  <Button
                    type="button"
                    onClick={onNextListingStep}
                    disabled={createListingSubmitting || loading}
                  >
                    Suivant
                  </Button>
                ) : (
                  <Button type="submit" disabled={createListingSubmitting || loading}>
                    {createListingSubmitting ? "Création en cours..." : "Créer annonce"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Page courante</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.loadedCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">En ligne</p>
            <p className="text-2xl font-semibold text-emerald-700">{stats.onlineCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Suspendus</p>
            <p className="text-2xl font-semibold text-amber-700">{stats.suspendedCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Hors ligne</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.offlineCount}</p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Filtres</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto_auto_auto]">
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Rechercher: uid, nom, email, téléphone"
              disabled={submitting}
            />

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={status}
              onChange={(event) => setStatus(event.target.value as AnnouncerStatusFilter)}
              disabled={submitting}
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="archived">Archivés</option>
            </select>

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={presence}
              onChange={(event) => setPresence(event.target.value as AnnouncerPresenceFilter)}
              disabled={submitting}
            >
              <option value="all">Toute présence</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
            </select>

            <Button type="button" onClick={onSearch} disabled={submitting}>
              Rechercher
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilters} disabled={submitting}>
              Réinitialiser
            </Button>
            <Button type="button" variant="outline" onClick={onExportCsv} disabled={loading || submitting}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Liste des annonceurs ({announcers.length}/{totalCountLabel}) - page {safePageIndex + 1}
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => void announcersQuery.refetch()}
              disabled={loading || submitting}
            >
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-2 pr-4 font-medium">Annonceur</th>
                        <th className="py-2 pr-4 font-medium">Statut</th>
                        <th className="py-2 pr-4 font-medium">Présence</th>
                        <th className="py-2 pr-4 font-medium">Depuis</th>
                        <th className="py-2 pr-4 font-medium">Dernière activité</th>
                        <th className="py-2 pr-4 font-medium">Réseaux</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcers.map((announcer) => {
                        const isArchived = announcer.state === "ARCHIVED";
                        const socialEntries = getAnnouncerSocialEntries(announcer);
                        return (
                          <tr key={announcer.uid} className="border-b border-slate-100 align-top">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-slate-900">{announcer.fullName}</p>
                              <p className="text-xs text-slate-500">{announcer.email ?? announcer.uid}</p>
                              {announcer.phoneNumbers.length > 0 ? (
                                <p className="text-xs text-slate-500">{announcer.phoneNumbers[0]}</p>
                              ) : null}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {isArchived ? "Archivé" : announcer.isSuspended ? "Suspendu" : "Actif"}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={
                                  announcer.presenceStatus === "online"
                                    ? "font-medium text-emerald-700"
                                    : "text-slate-700"
                                }
                              >
                                {announcer.presenceStatus === "online" ? "En ligne" : "Hors ligne"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {toDateLabel(announcer.announcerSinceAt)}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {toDateLabel(announcer.lastSeenAt)}
                            </td>
                            <td className="py-3 pr-4">
                              {socialEntries.length === 0 ? (
                                <span className="text-xs text-slate-400">Aucun</span>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {socialEntries.map((entry) =>
                                    entry.url ? (
                                      <a
                                        key={`${announcer.uid}-${entry.network}`}
                                        href={entry.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                        title={entry.handle ?? entry.url}
                                      >
                                        {entry.label}
                                      </a>
                                    ) : (
                                      <span
                                        key={`${announcer.uid}-${entry.network}`}
                                        className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                                        title={entry.handle ?? ""}
                                      >
                                        {entry.label}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUid(announcer.uid);
                                    setCreateListing((previous) => ({
                                      ...previous,
                                      announcerUid: announcer.uid,
                                      contact: announcer.phoneNumbers[0] ?? previous.contact,
                                    }));
                                    setCreateListingAnnouncerLookupInput(formatAnnouncerLookupLabel(announcer));
                                  }}
                                  disabled={submitting}
                                >
                                  Consulter
                                </Button>
                                {canUpdateAnnouncer && !isArchived ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={announcer.isSuspended ? "outline" : "destructive"}
                                    onClick={() => void onToggleSuspension(announcer)}
                                    disabled={submitting}
                                  >
                                    {announcer.isSuspended ? "Réactiver" : "Suspendre"}
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>
                    Debug curseur: courant=
                    <code>{currentPage?.page.cursor ?? "null"}</code> | suivant=
                    <code>{currentPage?.page.nextCursor ?? "null"}</code> | hasMore=
                    <code>{String(currentPage?.page.hasMore ?? false)}</code>
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onPreviousPage} disabled={!hasPrevious}>
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onNextPage()}
                      disabled={(!hasNextLoaded && !hasNextRemote) || announcersQuery.isFetchingNextPage}
                    >
                      {announcersQuery.isFetchingNextPage ? "Chargement..." : "Suivant"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Profil annonceur</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedUid ? (
              <p className="text-sm text-slate-600">Sélectionnez un annonceur pour voir ses détails.</p>
            ) : detailsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Chargement du profil...</p>
            ) : detailsQuery.error ? (
              <p className="text-sm text-red-700">{detailsQuery.error.message}</p>
            ) : detailsQuery.data ? (
              <>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Nom:</span> {detailsQuery.data.fullName}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Email:</span> {detailsQuery.data.email ?? "Non renseigné"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">UID:</span> {detailsQuery.data.uid}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Rôles:</span>{" "}
                  {detailsQuery.data.roles.length ? detailsQuery.data.roles.join(", ") : "Aucun"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Présence:</span>{" "}
                  {detailsQuery.data.presenceStatus === "online" ? "En ligne" : "Hors ligne"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Dernière activité:</span>{" "}
                  {toDateLabel(detailsQuery.data.lastSeenAt)}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Annonceur depuis:</span>{" "}
                  {toDateLabel(detailsQuery.data.announcerSinceAt)}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Création:</span> {toDateLabel(detailsQuery.data.createdAt)}
                </p>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Réseaux sociaux annonceur</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Liens et @ utilisés pour le sourcing des annonces depuis les réseaux.
                  </p>

                  {socialActionError ? (
                    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{socialActionError}</p>
                  ) : null}
                  {socialActionSuccess ? (
                    <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {socialActionSuccess}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-3">
                    {SOCIAL_NETWORK_KEYS.map((network) => (
                      <div key={network} className="rounded-md border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-medium text-slate-700">
                          {SOCIAL_NETWORK_LABELS[network]}
                        </p>
                        <div className="grid gap-2">
                          <Input
                            type="url"
                            placeholder={`https://${network}.com/...`}
                            value={socialProfilesDraft[network].url}
                            onChange={(event) =>
                              onChangeSocialField(network, "url", event.target.value)
                            }
                            disabled={socialSubmitting || !canUpdateAnnouncer}
                          />
                          <Input
                            placeholder="@username"
                            value={socialProfilesDraft[network].handle}
                            onChange={(event) =>
                              onChangeSocialField(network, "handle", event.target.value)
                            }
                            disabled={socialSubmitting || !canUpdateAnnouncer}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {canUpdateAnnouncer ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={() => void onSaveSocialProfiles()}
                        disabled={socialSubmitting}
                      >
                        {socialSubmitting ? "Enregistrement..." : "Enregistrer les réseaux"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Lecture seule: permission `announcers.update` requise.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
