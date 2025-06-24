import { createFile } from '@/db/file.db';
import { createProperty, updateProperty } from '@/db/property.db';
import { updateOrCreateSuggestion } from '@/db/suggestion.db';
import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Property } from '@/models/annonce';
import { act } from 'react-dom/test-utils';
import { MOCK_PROPERTIES } from '../mocks/annonce.mock';

// Mocks
jest.mock('@/db/file.db', () => ({
  createFile: jest.fn(),
}));

jest.mock('@/db/property.db', () => ({
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
}));

jest.mock('@/db/suggestion.db', () => ({
  updateOrCreateSuggestion: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('PropertyForm onSubmit', () => {
  const mockFormValues = {
    title: 'Test Property',
    description: 'Description here',
    price: 500,
    images: ['https://img1.jpg', new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' })],
  };

  const mockFileUpload = {
    fileURL: 'https://firebase.com/image1.jpg',
    name: 'test.jpg',
  };

  const mockUser = { uid: 'user123' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call createFile and createProperty when submitting new property', async () => {
    (createFile as jest.Mock).mockResolvedValueOnce(mockFileUpload);
    (createProperty as jest.Mock).mockResolvedValueOnce('new-id');

    const property: Property = {
      ...mockFormValues,
      createdBy: mockUser.uid,
      images: [mockFileUpload],
      id: 'property-id',
    } as unknown as Property;

    const { result } = renderHook(() =>
      useForm({
        defaultValues: {
          ...property,
          images: mockFormValues.images,
        },
      })
    );

    await act(async () => {
      const files = [mockFormValues.images[1]]; // Only the file
      const uploadedImages = await Promise.all(
        files.map((file: File|string) => createFile(file as File, mockUser.uid, 'property'))
      );
      const propertyToCreate = {
        ...property,
        images: [...uploadedImages],
      };
      await createProperty(propertyToCreate);
      await updateOrCreateSuggestion({
        province: property.province,
        city: property.city,
        street: property.street,
      });
    });

    expect(createFile).toHaveBeenCalledTimes(1);
    expect(createProperty).toHaveBeenCalledTimes(1);
    expect(updateOrCreateSuggestion).toHaveBeenCalledTimes(1);
  });

  it('should call updateProperty when updating an existing property', async () => {
    const propertyToUpdate = { ...MOCK_PROPERTIES[0], id: 'property-id' };

    const { result } = renderHook(() =>
      useForm({
        defaultValues: {
          ...propertyToUpdate,
          images: propertyToUpdate.images,
        },
      })
    );

    await act(async () => {
      await updateProperty(propertyToUpdate.id!, propertyToUpdate as any);
      await updateOrCreateSuggestion({
        province: propertyToUpdate.province,
        city: propertyToUpdate.city,
        street: propertyToUpdate.street,
      });
    });

    expect(updateProperty).toHaveBeenCalledWith(propertyToUpdate.id!, propertyToUpdate);
    expect(updateOrCreateSuggestion).toHaveBeenCalledWith({
      province: propertyToUpdate.province,
      city: propertyToUpdate.city,
      street: propertyToUpdate.street,
    });
  });
});
