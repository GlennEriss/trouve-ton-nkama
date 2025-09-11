import { PhotonResult } from "@/models/PhotonResult";

export const GABON_BBOX = '8.5,-4.0,14.8,2.3';
export const PHOTON_URL = 'https://photon.komoot.io';

export async function searchPhoton(query: string, limit = 8): Promise<PhotonResult[]> {
  if (!query || query.length < 2) return [];

  const response = await fetch(
    `${PHOTON_URL}/api?q=${encodeURIComponent(query)}&bbox=${GABON_BBOX}&limit=${limit}&lang=fr`
  );

  if (!response.ok) return [];

  const data = await response.json();

  return data.features.filter(
    (result: PhotonResult) =>
      result.properties.country === 'Gabon' || result.properties.country === 'GA'
  );
}

export async function reversePhoton(lon: number, lat: number): Promise<PhotonResult | null> {
  const response = await fetch(
    `${PHOTON_URL}/reverse?lon=${lon}&lat=${lat}&limit=1&lang=fr`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const result = data.features[0];
  if (!result) return null;

  if (result.properties.country === 'Gabon' || result.properties.country === 'GA') {
    return result;
  }
  return null;
}