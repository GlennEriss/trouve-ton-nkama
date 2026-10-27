import { getAuth } from '@react-native-firebase/auth';
import { getDownloadURL, getStorage, putFile, ref } from '@react-native-firebase/storage';
import type { ImagePickerAsset } from 'expo-image-picker';
import { apiFetch } from './client';

export type UploadedImage = { fileURL: string; filePATH: string };
export type GenerationPhase = 'idle' | 'photos' | 'generation' | 'validation' | 'enregistrement';

async function uploadOneImage(asset: ImagePickerAsset, index: number): Promise<UploadedImage> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Session Firebase introuvable.');
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const filePATH = `property/${uid}-${Date.now()}-${index}.${extension}`;
  const storageRef = ref(getStorage(), filePATH);
  await putFile(storageRef, asset.uri, {
    contentType: asset.mimeType || `image/${extension}`,
    customMetadata: { owner: uid, status: 'InProgress' },
  });
  return { fileURL: await getDownloadURL(storageRef), filePATH };
}

export async function uploadListingImages(assets: ImagePickerAsset[]): Promise<UploadedImage[]> {
  const uploaded: UploadedImage[] = [];
  // Concurrence bornée à 3, même décision que la PWA : rapide sans saturer les réseaux mobiles.
  for (let start = 0; start < assets.length; start += 3) {
    const batch = assets.slice(start, start + 3);
    uploaded.push(...(await Promise.all(batch.map((asset, index) => uploadOneImage(asset, start + index)))));
  }
  return uploaded;
}

export async function requestPropertyDraft(description: string): Promise<Record<string, unknown>> {
  const payload = await apiFetch<{ success: true; data: Record<string, unknown> }>('/api/ai/property-draft', {
    method: 'POST', body: { description },
  });
  return payload.data;
}

export async function requestCategoryDraft(description: string): Promise<Record<string, unknown>> {
  const payload = await apiFetch<{ success: true; data: Record<string, unknown> }>('/api/ai/category-listing-draft', {
    method: 'POST', body: { description },
  });
  return payload.data;
}

export async function createMobileListing(input: Record<string, unknown>): Promise<{ success: true; id: string }> {
  return apiFetch('/api/properties/mobile-create', { method: 'POST', body: input });
}
