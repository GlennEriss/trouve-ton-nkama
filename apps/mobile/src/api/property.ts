import { apiFetch } from './client';
import type { PropertyImage } from '../lib/propertyImage';

export type PropertyDetail = {
  id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  typeProperty: string;
  status: 'FOR_RENT' | 'FOR_SALE';
  city: string;
  province: string;
  street?: string;
  images: PropertyImage[];
  nbrRooms?: number;
  nbrBathrooms?: number;
  contact?: string;
  whatsappContact?: string;
  callContact?: string;
  additionalContacts?: string[];
};

export async function getPropertyById(id: string): Promise<PropertyDetail> {
  return apiFetch<PropertyDetail>(`/api/property/id?id=${encodeURIComponent(id)}`);
}
