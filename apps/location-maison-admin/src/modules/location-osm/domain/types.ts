export type GabonOsmSourceMode = "cloud" | "local";

export type GabonOsmProvinceOption = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export type GabonOsmCityOption = {
  id: string;
  name: string;
  province: string | null;
  lat: number;
  lon: number;
};

export type GabonOsmQuarterOption = {
  id: string;
  name: string;
  aliases: string[];
  city: string | null;
  province: string | null;
  lat: number;
  lon: number;
};

export type GabonOsmSelectorData = {
  country: {
    name: string;
    iso2: string;
  };
  sourceMode: GabonOsmSourceMode;
  sourcePath: string;
  sourceBucket: string | null;
  sourceObjectPath: string | null;
  sourceUpdatedAt: string | null;
  provinces: GabonOsmProvinceOption[];
  cities: GabonOsmCityOption[];
  quarters: GabonOsmQuarterOption[];
};

export type GabonOsmProjectionSyncResult = {
  country: {
    name: string;
    iso2: string;
  };
  sourceMode: GabonOsmSourceMode;
  sourcePath: string;
  sourceBucket: string | null;
  sourceObjectPath: string | null;
  sourceUpdatedAt: string | null;
  counts: {
    provinces: number;
    cities: number;
    quarters: number;
  };
  syncedAt: string;
};
