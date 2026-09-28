import { getAuth } from '@react-native-firebase/auth';
import { getStorage, putFile, ref } from '@react-native-firebase/storage';
import { apiFetch } from './client';

export type PublicReel = {
  id: string;
  propertyId?: string | null;
  categoryPath?: { rootName?: string };
  createdBy: string;
  contact?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  shareCount?: number;
  giftCount?: number;
};

export type ReelsFeedPage = { reels: PublicReel[]; nextCursor: string | null };

export async function listPublicReels(cursor: string | null, category: string | null): Promise<ReelsFeedPage> {
  const params = new URLSearchParams({ limitPerPage: '10' });
  if (cursor) params.set('cursor', cursor);
  if (category) params.set('category', category);
  return apiFetch<ReelsFeedPage>(`/api/reels/feed?${params.toString()}`);
}

const statisticsVisitorId = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function trackReelView(reelId: string): Promise<void> {
  await apiFetch(`/api/reels/${encodeURIComponent(reelId)}/statistics/view`, { method: 'POST', body: { visitorId: statisticsVisitorId } });
}

export async function trackReelLike(reelId: string, liked: boolean): Promise<void> {
  await apiFetch(`/api/reels/${encodeURIComponent(reelId)}/statistics/like`, { method: 'POST', body: { liked, visitorId: statisticsVisitorId } });
}

export async function trackReelShare(reelId: string): Promise<void> {
  await apiFetch(`/api/reels/${encodeURIComponent(reelId)}/statistics/share`, { method: 'POST', body: { target: 'native', visitorId: statisticsVisitorId } });
}

export type CreateReelInput = {
  reelId: string;
  propertyId?: string | null;
  rawVideoPath: string;
  contact?: string;
  description?: string;
  categoryRoot?: 'Immobilier' | 'Mode';
};

export function createMobileReelId(): string {
  const uid = getAuth().currentUser?.uid ?? 'mobile';
  return `${uid.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createReel(input: CreateReelInput): Promise<{ success: true; reelId: string }> {
  return apiFetch('/api/reels', { method: 'POST', body: input });
}

export async function markReelUploadFailed(reelId: string, processingError: string): Promise<void> {
  await apiFetch('/api/reels', {
    method: 'PATCH',
    body: { action: 'mark-upload-failed', reelId, processingError },
  });
}

export async function uploadReelVideo(
  uri: string,
  rawVideoPath: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const task = putFile(ref(getStorage(), rawVideoPath), uri, {
    contentType: 'video/mp4',
    customMetadata: { owner: getAuth().currentUser?.uid ?? 'unknown', status: 'InProgress' },
  });

  task.on('state_changed', (snapshot) => {
    const percent = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
    onProgress?.(percent);
  });
  await task;
}
