"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type AnnouncerLookupItem = {
  uid: string;
  fullName: string;
  email: string | null;
  phoneNumbers: string[];
};

type AnnouncerLookupPayload = {
  announcers: AnnouncerLookupItem[];
};

type CreateListingPayload = {
  propertyId: string;
  announcerUid: string;
  typeProperty: string;
  status: "FOR_RENT" | "FOR_SALE";
  title: string;
};

type GabonOsmProvinceOption = {
  name: string;
  lat: number;
  lon: number;
};

type GabonOsmCityOption = {
  name: string;
  province: string | null;
  lat: number;
  lon: number;
};

type GabonOsmQuarterOption = {
  name: string;
  city: string | null;
  province: string | null;
  lat: number;
  lon: number;
};

type GabonOsmSelectorPayload = {
  country: {
    name: string;
    iso2: string;
  };
  sourcePath: string;
  provinces: GabonOsmProvinceOption[];
  cities: GabonOsmCityOption[];
  quarters: GabonOsmQuarterOption[];
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

type ListingWizardStep = 1 | 2 | 3;

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

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
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

function isLogementLike(type: CreateListingFormState["typeProperty"]) {
  return type === "Logement" || type === "Home" || type === "Studio" || type === "Apartment" || type === "Villa";
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

function formatAnnouncerLookupLabel(announcer: {
  uid: string;
  fullName: string;
  email: string | null;
}) {
  return `${announcer.fullName}${announcer.email ? ` — ${announcer.email}` : ""} (${announcer.uid})`;
}

function normalizeSelectionName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s’'`´-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findOptionByName<T extends { name: string }>(options: T[], value: string) {
  const target = value.trim();
  if (!target) {
    return null;
  }
  const direct = options.find((option) => option.name === target);
  if (direct) {
    return direct;
  }
  const normalized = normalizeSelectionName(target);
  if (!normalized) {
    return null;
  }
  return options.find((option) => normalizeSelectionName(option.name) === normalized) ?? null;
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

async function fetchAnnouncerLookup(query: string) {
  const params = new URLSearchParams();
  params.set("limit", "20");
  params.set("query", query.trim());
  params.set("status", "all");
  params.set("presence", "all");

  const response = await fetch(`/api/admin/v1/announcers?${params.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: AnnouncerLookupPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les annonceurs." : payload.error?.message);
  }

  return payload.data;
}

async function fetchGabonOsmSelector() {
  const response = await fetch("/api/admin/v1/osm/gabon");
  const payload = (await response.json()) as
    | { success: true; data: GabonOsmSelectorPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger l'OSM." : payload.error?.message);
  }

  return payload.data;
}

export default function NewListingPage() {
  const searchParams = useSearchParams();
  const initialAnnouncerUid = searchParams.get("announcerUid")?.trim() ?? "";

  const [listingStep, setListingStep] = useState<ListingWizardStep>(1);
  const [createListingSubmitting, setCreateListingSubmitting] = useState(false);
  const [createListingError, setCreateListingError] = useState<string | null>(null);
  const [createListingResult, setCreateListingResult] = useState<CreateListingPayload | null>(null);

  const [createListing, setCreateListing] = useState<CreateListingFormState>({
    announcerUid: initialAnnouncerUid,
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

  const [createListingAnnouncerLookupInput, setCreateListingAnnouncerLookupInput] = useState(initialAnnouncerUid);
  const [createListingAnnouncerLookupDebounced, setCreateListingAnnouncerLookupDebounced] = useState("");
  const [showCreateListingAnnouncerLookup, setShowCreateListingAnnouncerLookup] = useState(false);
  const [listingLocalImages, setListingLocalImages] = useState<LocalListingImage[]>([]);
  const listingLocalImagesRef = useRef<LocalListingImage[]>([]);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  const permissions = useMemo(
    () => permissionsQuery.data?.admin.permissions ?? [],
    [permissionsQuery.data?.admin.permissions],
  );
  const canCreateListing = useMemo(() => hasPermission(permissions, "listings.create"), [permissions]);
  const gabonOsmQuery = useQuery({
    queryKey: ["osm", "gabon", "selector"],
    enabled: canCreateListing,
    queryFn: fetchGabonOsmSelector,
  });

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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCreateListingAnnouncerLookupDebounced(createListingAnnouncerLookupInput.trim());
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [createListingAnnouncerLookupInput]);

  const lookupQuery = useQuery({
    queryKey: ["announcers", "lookup", createListingAnnouncerLookupDebounced],
    enabled: canCreateListing && createListingAnnouncerLookupDebounced.length >= 2,
    queryFn: () => fetchAnnouncerLookup(createListingAnnouncerLookupDebounced),
  });

  const lookupResults = lookupQuery.data?.announcers ?? [];
  const selectedListingTags = useMemo(
    () => ensureMaxTags(splitTextList(createListing.tagsRaw)),
    [createListing.tagsRaw],
  );
  const osmCountryName = gabonOsmQuery.data?.country.name ?? "Gabon";
  const osmCountryCode = gabonOsmQuery.data?.country.iso2 ?? "GA";
  const osmProvinceOptions = useMemo(
    () => gabonOsmQuery.data?.provinces ?? [],
    [gabonOsmQuery.data?.provinces],
  );
  const selectedProvinceOption = useMemo(
    () => findOptionByName(osmProvinceOptions, createListing.province),
    [createListing.province, osmProvinceOptions],
  );
  const osmCityOptions = useMemo(() => {
    const allCities = gabonOsmQuery.data?.cities ?? [];
    const selectedProvince = selectedProvinceOption?.name ?? createListing.province.trim();
    if (!selectedProvince) {
      return allCities;
    }
    const normalizedProvince = normalizeSelectionName(selectedProvince);
    return allCities.filter((city) => {
      const province = city.province?.trim();
      if (!province) {
        return true;
      }
      return normalizeSelectionName(province) === normalizedProvince;
    });
  }, [createListing.province, gabonOsmQuery.data?.cities, selectedProvinceOption?.name]);
  const selectedCityOption = useMemo(
    () => findOptionByName(osmCityOptions, createListing.city),
    [createListing.city, osmCityOptions],
  );
  const osmQuarterOptions = useMemo(() => {
    const allQuarters = gabonOsmQuery.data?.quarters ?? [];
    const selectedCity = selectedCityOption?.name ?? createListing.city.trim();
    const selectedProvince = selectedProvinceOption?.name ?? createListing.province.trim();
    if (selectedCity) {
      const normalizedCity = normalizeSelectionName(selectedCity);
      return allQuarters.filter((quarter) => {
        const cityName = quarter.city?.trim();
        return cityName ? normalizeSelectionName(cityName) === normalizedCity : true;
      });
    }
    if (selectedProvince) {
      const normalizedProvince = normalizeSelectionName(selectedProvince);
      return allQuarters.filter((quarter) => {
        const provinceName = quarter.province?.trim();
        return provinceName ? normalizeSelectionName(provinceName) === normalizedProvince : true;
      });
    }
    return allQuarters;
  }, [
    createListing.city,
    createListing.province,
    gabonOsmQuery.data?.quarters,
    selectedCityOption?.name,
    selectedProvinceOption?.name,
  ]);
  const hasOsmOptions = osmProvinceOptions.length > 0;

  const clearListingLocalImages = useCallback(() => {
    setListingLocalImages((previous) => {
      for (const image of previous) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return [];
    });
  }, []);

  const onSelectCreateListingAnnouncer = useCallback((announcer: AnnouncerLookupItem) => {
    setCreateListing((previous) => ({
      ...previous,
      announcerUid: announcer.uid,
      contact: announcer.phoneNumbers[0] ?? previous.contact,
    }));
    setCreateListingAnnouncerLookupInput(formatAnnouncerLookupLabel(announcer));
    setShowCreateListingAnnouncerLookup(false);
  }, []);

  const onSelectOsmProvince = useCallback(
    (provinceName: string) => {
      const provinceOption = findOptionByName(osmProvinceOptions, provinceName);
      setCreateListing((previous) => ({
        ...previous,
        province: provinceOption?.name ?? provinceName,
        provinceLon: provinceOption ? String(provinceOption.lon) : "",
        provinceLat: provinceOption ? String(provinceOption.lat) : "",
        city: "",
        cityLon: "",
        cityLat: "",
        street: "",
        streetLon: "",
        streetLat: "",
        country: osmCountryName,
        countryCode: osmCountryCode,
        longitude: provinceOption ? String(provinceOption.lon) : previous.longitude,
        latitude: provinceOption ? String(provinceOption.lat) : previous.latitude,
      }));
    },
    [osmCountryCode, osmCountryName, osmProvinceOptions],
  );

  const onSelectOsmCity = useCallback(
    (cityName: string) => {
      const cityOption = findOptionByName(osmCityOptions, cityName);
      const provinceFromCity = cityOption?.province
        ? findOptionByName(osmProvinceOptions, cityOption.province)
        : null;
      setCreateListing((previous) => ({
        ...previous,
        city: cityOption?.name ?? cityName,
        cityLon: cityOption ? String(cityOption.lon) : "",
        cityLat: cityOption ? String(cityOption.lat) : "",
        street: "",
        streetLon: "",
        streetLat: "",
        province: provinceFromCity?.name ?? previous.province,
        provinceLon: provinceFromCity ? String(provinceFromCity.lon) : previous.provinceLon,
        provinceLat: provinceFromCity ? String(provinceFromCity.lat) : previous.provinceLat,
        country: osmCountryName,
        countryCode: osmCountryCode,
        longitude: cityOption ? String(cityOption.lon) : previous.longitude,
        latitude: cityOption ? String(cityOption.lat) : previous.latitude,
      }));
    },
    [osmCityOptions, osmCountryCode, osmCountryName, osmProvinceOptions],
  );

  const onSelectOsmQuarter = useCallback(
    (quarterName: string) => {
      const quarterOption = findOptionByName(osmQuarterOptions, quarterName);
      const cityFromQuarter = quarterOption?.city ? findOptionByName(osmCityOptions, quarterOption.city) : null;
      const provinceFromQuarterName = quarterOption?.province
        ? findOptionByName(osmProvinceOptions, quarterOption.province)
        : null;
      const provinceFromCity = cityFromQuarter?.province
        ? findOptionByName(osmProvinceOptions, cityFromQuarter.province)
        : null;
      const provinceOption = provinceFromQuarterName ?? provinceFromCity;

      setCreateListing((previous) => ({
        ...previous,
        street: quarterOption?.name ?? quarterName,
        streetLon: quarterOption ? String(quarterOption.lon) : "",
        streetLat: quarterOption ? String(quarterOption.lat) : "",
        city: cityFromQuarter?.name ?? previous.city,
        cityLon: cityFromQuarter ? String(cityFromQuarter.lon) : previous.cityLon,
        cityLat: cityFromQuarter ? String(cityFromQuarter.lat) : previous.cityLat,
        province: provinceOption?.name ?? previous.province,
        provinceLon: provinceOption ? String(provinceOption.lon) : previous.provinceLon,
        provinceLat: provinceOption ? String(provinceOption.lat) : previous.provinceLat,
        country: osmCountryName,
        countryCode: osmCountryCode,
        longitude: quarterOption ? String(quarterOption.lon) : previous.longitude,
        latitude: quarterOption ? String(quarterOption.lat) : previous.latitude,
      }));
    },
    [osmCityOptions, osmCountryCode, osmCountryName, osmProvinceOptions, osmQuarterOptions],
  );

  const onPickListingImages = useCallback((event: ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const onRemoveListingImage = useCallback((id: string) => {
    setListingLocalImages((previous) => {
      const target = previous.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((image) => image.id !== id);
    });
  }, []);

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
    if (!createListing.announcerUid.trim()) return "UID annonceur requis.";
    if (createListing.title.trim().length < 3) return "Le titre doit contenir au moins 3 caractères.";
    if (createListing.description.trim().length < 10) return "La description doit contenir au moins 10 caractères.";
    if (!isPositiveNumber(createListing.price)) return "Le prix doit être supérieur à 0.";
    if (!isNonNegativeNumber(createListing.area)) return "La surface doit être un nombre positif ou nul.";
    if (selectedListingTags.length < 1) return "Ajoute au moins 1 tag (maximum 6).";
    if (selectedListingTags.length > 6) return "Maximum 6 tags.";
    if (listingLocalImages.length < 1) return "Ajoute au moins 1 image.";
    if (listingLocalImages.length > MAX_LISTING_IMAGES) return "Maximum 10 images.";
    return null;
  }, [createListing, listingLocalImages.length, selectedListingTags.length]);

  const validateListingStep2 = useCallback(() => {
    const requireNumber = (value: string, label: string) => {
      if (!isFiniteNumber(value)) return `${label} est requis pour ce type d'annonce.`;
      return null;
    };
    const requireString = (value: string, label: string) => {
      if (!value.trim()) return `${label} est requis pour ce type d'annonce.`;
      return null;
    };
    const requireLogementBase = () =>
      requireNumber(createListing.nbrRooms, "nbrRooms") ||
      requireNumber(createListing.nbrKitchens, "nbrKitchens") ||
      requireNumber(createListing.nbrBathrooms, "nbrBathrooms") ||
      requireNumber(createListing.nbrToilets, "nbrToilets");

    if (createListing.typeProperty === "Logement") return requireLogementBase();
    if (createListing.typeProperty === "Home") {
      return (
        requireLogementBase() ||
        requireNumber(createListing.nbrGarages, "nbrGarages") ||
        requireNumber(createListing.nbrFloors, "nbrFloors") ||
        requireNumber(createListing.nbrLivingRoom, "nbrLivingRoom")
      );
    }
    if (createListing.typeProperty === "Studio") {
      return (
        requireLogementBase() ||
        requireNumber(createListing.nbrFloorStudio, "nbrFloorStudio") ||
        requireString(createListing.numeroStudio, "numeroStudio")
      );
    }
    if (createListing.typeProperty === "Apartment") {
      return (
        requireLogementBase() ||
        requireNumber(createListing.nbrFloorApartment, "nbrFloorApartment") ||
        requireString(createListing.numeroApartment, "numeroApartment")
      );
    }
    if (createListing.typeProperty === "Villa") {
      return (
        requireLogementBase() ||
        requireNumber(createListing.nbrFloors, "nbrFloors") ||
        requireNumber(createListing.nbrPiscine, "nbrPiscine") ||
        requireNumber(createListing.nbrGarages, "nbrGarages")
      );
    }
    if (createListing.typeProperty === "Desk") {
      return (
        requireNumber(createListing.nbrToilets, "nbrToilets") ||
        requireNumber(createListing.nbrRooms, "nbrRooms")
      );
    }
    if (createListing.typeProperty === "Building") {
      return (
        requireNumber(createListing.nbrApartments, "nbrApartments") ||
        requireNumber(createListing.nbrFloors, "nbrFloors")
      );
    }
    if (createListing.typeProperty === "Shop") {
      return (
        requireNumber(createListing.nbrRooms, "nbrRooms") ||
        requireNumber(createListing.nbrToilet, "nbrToilet")
      );
    }
    if (createListing.typeProperty === "Kiosk") return requireString(createListing.kioskType, "kioskType");
    if (createListing.typeProperty === "Room") return requireString(createListing.roomType, "roomType");

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

  const onCreateListing = useCallback(
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
        if (step1Error) throw new Error(step1Error);
        const step2Error = validateListingStep2();
        if (step2Error) throw new Error(step2Error);
        const step3Error = validateListingStep3();
        if (step3Error) throw new Error(step3Error);

        const uploadedImages = await uploadListingImages();

        const response = await fetch("/api/admin/v1/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
            tags: selectedListingTags,
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
        clearListingLocalImages();
        setListingStep(1);
        const params = new URLSearchParams();
        params.set("created", "1");
        params.set("propertyId", payload.data.propertyId);
        window.location.assign(`/dashboard/listings?${params.toString()}`);
      } catch (error) {
        setCreateListingError(error instanceof Error ? error.message : "Impossible de créer l'annonce.");
      } finally {
        setCreateListingSubmitting(false);
      }
    },
    [
      canCreateListing,
      clearListingLocalImages,
      createListing,
      selectedListingTags,
      uploadListingImages,
      validateListingStep1,
      validateListingStep2,
      validateListingStep3,
    ],
  );

  const loading = permissionsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle annonce"
        description="Création d'une annonce depuis le module Annonces."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => window.location.assign("/dashboard/listings")}>
              Retour aux annonces
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Créer une annonce</h2>
          <p className="text-sm text-slate-600">Ajoute une annonce au compte annonceur ciblé.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onCreateListing(event)}>
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
                    {lookupQuery.isFetching ? (
                      <p className="px-2 py-1 text-slate-500">Recherche des annonceurs...</p>
                    ) : lookupQuery.error ? (
                      <p className="px-2 py-1 text-red-700">{lookupQuery.error.message}</p>
                    ) : lookupResults.length ? (
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {lookupResults.map((announcer) => (
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
                  <Input value={createListing.announcerUid} readOnly placeholder="UID annonceur sélectionné" disabled />
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
                  <p className="text-sm font-medium text-slate-900">Tags ({selectedListingTags.length}/6)</p>
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
                      Images ({listingLocalImages.length}/{MAX_LISTING_IMAGES})
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
                            <p className="text-[10px] text-slate-500">{(image.file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                    <p className="text-xs text-slate-500">Ajoute entre 1 et 10 images JPG/PNG/WEBP.</p>
                  )}
                </div>
              </div>
            ) : null}

            {listingStep === 2 ? (
              <div className="space-y-3">
                {isLogementLike(createListing.typeProperty) ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="number" min={0} step={1} value={createListing.nbrRooms} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrRooms: event.target.value }))} placeholder="Nombre de chambres" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrKitchens} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrKitchens: event.target.value }))} placeholder="Nombre de cuisines" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrBathrooms} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrBathrooms: event.target.value }))} placeholder="Nombre de salles d'eau" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrToilets} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrToilets: event.target.value }))} placeholder="Nombre de toilettes" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Home" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input type="number" min={0} step={1} value={createListing.nbrGarages} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrGarages: event.target.value }))} placeholder="Nombre de garages" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrFloors} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrFloors: event.target.value }))} placeholder="Nombre d'étages" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrLivingRoom} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrLivingRoom: event.target.value }))} placeholder="Nombre de salons" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Studio" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="number" min={0} step={1} value={createListing.nbrFloorStudio} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrFloorStudio: event.target.value }))} placeholder="Étage du studio" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.numeroStudio} onChange={(event) => setCreateListing((previous) => ({ ...previous, numeroStudio: event.target.value }))} placeholder="Numéro du studio" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Apartment" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="number" min={0} step={1} value={createListing.nbrFloorApartment} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrFloorApartment: event.target.value }))} placeholder="Étage de l'appartement" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.numeroApartment} onChange={(event) => setCreateListing((previous) => ({ ...previous, numeroApartment: event.target.value }))} placeholder="Numéro de l'appartement" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Villa" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input type="number" min={0} step={1} value={createListing.nbrFloors} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrFloors: event.target.value }))} placeholder="Nombre d'étages" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrPiscine} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrPiscine: event.target.value }))} placeholder="Nombre de piscines" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrGarages} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrGarages: event.target.value }))} placeholder="Nombre de garages" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Desk" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="number" min={0} step={1} value={createListing.nbrToilets} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrToilets: event.target.value }))} placeholder="Nombre de toilettes" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrRooms} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrRooms: event.target.value }))} placeholder="Nombre de pièces" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Building" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input type="number" min={0} step={1} value={createListing.nbrApartments} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrApartments: event.target.value }))} placeholder="Nombre d'appartements" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrFloors} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrFloors: event.target.value }))} placeholder="Nombre d'étages" disabled={createListingSubmitting || loading} />
                    <select className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800" value={createListing.hasParking} onChange={(event) => setCreateListing((previous) => ({ ...previous, hasParking: event.target.value as "true" | "false" }))} disabled={createListingSubmitting || loading}>
                      <option value="true">Parking: Oui</option>
                      <option value="false">Parking: Non</option>
                    </select>
                  </div>
                ) : null}

                {createListing.typeProperty === "Shop" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input type="number" min={0} step={1} value={createListing.nbrRooms} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrRooms: event.target.value }))} placeholder="Nombre de pièces" disabled={createListingSubmitting || loading} />
                    <Input type="number" min={0} step={1} value={createListing.nbrToilet} onChange={(event) => setCreateListing((previous) => ({ ...previous, nbrToilet: event.target.value }))} placeholder="Nombre de toilettes" disabled={createListingSubmitting || loading} />
                  </div>
                ) : null}

                {createListing.typeProperty === "Kiosk" ? (
                  <Input value={createListing.kioskType} onChange={(event) => setCreateListing((previous) => ({ ...previous, kioskType: event.target.value }))} placeholder="Type de kiosque" disabled={createListingSubmitting || loading} />
                ) : null}

                {createListing.typeProperty === "Room" ? (
                  <Input value={createListing.roomType} onChange={(event) => setCreateListing((previous) => ({ ...previous, roomType: event.target.value }))} placeholder="Type de chambre" disabled={createListingSubmitting || loading} />
                ) : null}

                {createListing.typeProperty === "Land" || createListing.typeProperty === "Property" ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Ce type n&apos;a pas d&apos;attribut supplémentaire à l&apos;étape 2.
                  </p>
                ) : null}
              </div>
            ) : null}

            {listingStep === 3 ? (
              <div className="space-y-3">
                {gabonOsmQuery.isFetching ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Chargement de la source OSM...
                  </p>
                ) : null}
                {gabonOsmQuery.error ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    OSM indisponible pour le moment. Saisie manuelle activée.
                  </p>
                ) : null}

                {hasOsmOptions ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Province (OSM)</p>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={createListing.province}
                        onChange={(event) => onSelectOsmProvince(event.target.value)}
                        disabled={createListingSubmitting || loading}
                      >
                        <option value="">Sélectionner une province</option>
                        {osmProvinceOptions.map((province) => (
                          <option key={province.name} value={province.name}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Ville (OSM)</p>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={createListing.city}
                        onChange={(event) => onSelectOsmCity(event.target.value)}
                        disabled={createListingSubmitting || loading || osmCityOptions.length === 0}
                      >
                        <option value="">Sélectionner une ville</option>
                        {osmCityOptions.map((city) => (
                          <option
                            key={`${city.name}-${city.province ?? "n/a"}`}
                            value={city.name}
                          >
                            {city.name}
                            {city.province ? ` · ${city.province}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Quartier (OSM)</p>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                        value={createListing.street}
                        onChange={(event) => onSelectOsmQuarter(event.target.value)}
                        disabled={createListingSubmitting || loading || osmQuarterOptions.length === 0}
                      >
                        <option value="">Sélectionner un quartier</option>
                        {osmQuarterOptions.map((quarter) => (
                          <option
                            key={`${quarter.name}-${quarter.city ?? "n/a"}-${quarter.province ?? "n/a"}`}
                            value={quarter.name}
                          >
                            {quarter.name}
                            {quarter.city ? ` · ${quarter.city}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      value={createListing.province}
                      onChange={(event) =>
                        setCreateListing((previous) => ({ ...previous, province: event.target.value }))
                      }
                      placeholder="Province"
                      disabled={createListingSubmitting || loading}
                    />
                    <Input
                      value={createListing.city}
                      onChange={(event) =>
                        setCreateListing((previous) => ({ ...previous, city: event.target.value }))
                      }
                      placeholder="Ville"
                      disabled={createListingSubmitting || loading}
                    />
                    <Input
                      value={createListing.street}
                      onChange={(event) =>
                        setCreateListing((previous) => ({ ...previous, street: event.target.value }))
                      }
                      placeholder="Quartier / District"
                      disabled={createListingSubmitting || loading}
                    />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={createListing.country}
                    onChange={(event) =>
                      setCreateListing((previous) => ({ ...previous, country: event.target.value }))
                    }
                    placeholder="Pays"
                    disabled={createListingSubmitting || loading}
                  />
                  <Input
                    value={createListing.countryCode}
                    onChange={(event) =>
                      setCreateListing((previous) => ({ ...previous, countryCode: event.target.value }))
                    }
                    placeholder="Code pays"
                    disabled={createListingSubmitting || loading}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input type="number" step="any" value={createListing.longitude} onChange={(event) => setCreateListing((previous) => ({ ...previous, longitude: event.target.value }))} placeholder="Longitude" disabled={createListingSubmitting || loading} />
                  <Input type="number" step="any" value={createListing.latitude} onChange={(event) => setCreateListing((previous) => ({ ...previous, latitude: event.target.value }))} placeholder="Latitude" disabled={createListingSubmitting || loading} />
                  <Input value={createListing.contact} onChange={(event) => setCreateListing((previous) => ({ ...previous, contact: event.target.value }))} placeholder="Contact (optionnel)" disabled={createListingSubmitting || loading} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input type="number" step="any" value={createListing.provinceLon} onChange={(event) => setCreateListing((previous) => ({ ...previous, provinceLon: event.target.value }))} placeholder="Province Lon (optionnel)" disabled={createListingSubmitting || loading} />
                  <Input type="number" step="any" value={createListing.provinceLat} onChange={(event) => setCreateListing((previous) => ({ ...previous, provinceLat: event.target.value }))} placeholder="Province Lat (optionnel)" disabled={createListingSubmitting || loading} />
                  <Input type="number" step="any" value={createListing.cityLon} onChange={(event) => setCreateListing((previous) => ({ ...previous, cityLon: event.target.value }))} placeholder="City Lon (optionnel)" disabled={createListingSubmitting || loading} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input type="number" step="any" value={createListing.cityLat} onChange={(event) => setCreateListing((previous) => ({ ...previous, cityLat: event.target.value }))} placeholder="City Lat (optionnel)" disabled={createListingSubmitting || loading} />
                  <Input type="number" step="any" value={createListing.streetLon} onChange={(event) => setCreateListing((previous) => ({ ...previous, streetLon: event.target.value }))} placeholder="Street Lon (optionnel)" disabled={createListingSubmitting || loading} />
                  <Input type="number" step="any" value={createListing.streetLat} onChange={(event) => setCreateListing((previous) => ({ ...previous, streetLat: event.target.value }))} placeholder="Street Lat (optionnel)" disabled={createListingSubmitting || loading} />
                </div>
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
                <Button type="button" onClick={onNextListingStep} disabled={createListingSubmitting || loading}>
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
    </div>
  );
}
