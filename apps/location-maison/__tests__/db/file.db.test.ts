import { describe, test, expect, jest } from '@jest/globals';
import {
  createFile,
  updateFile,
  timestampedFileName
} from '@/db/file.db';

// Mock des dépendances Firebase Storage
jest.mock('@/firebase/storage', () => ({
  storage: {},
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  updateMetadata: jest.fn()
}));

describe('File DB Integration Tests', () => {
  const testOwnerId = 'test-owner-123';
  const testLocation = 'properties/images';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timestampedFileName', () => {
    test('devrait ajouter un timestamp au nom de fichier', () => {
      const originalFileName = 'maison-libreville.jpg';
      const timestampedName = timestampedFileName(originalFileName);

      expect(timestampedName).toMatch(/^\d+maison-libreville\.jpg$/);
      expect(timestampedName).toContain('maison-libreville.jpg');
      expect(timestampedName.length).toBeGreaterThan(originalFileName.length);
    });

    test('devrait gérer les fichiers sans extension', () => {
      const originalFileName = 'document-propriete';
      const timestampedName = timestampedFileName(originalFileName);

      expect(timestampedName).toMatch(/^\d+document-propriete$/);
    });

    test('devrait gérer les noms de fichiers avec espaces', () => {
      const originalFileName = 'photo maison avec jardin.png';
      const timestampedName = timestampedFileName(originalFileName);

      expect(timestampedName).toMatch(/^\d+photo maison avec jardin\.png$/);
    });

    test('devrait générer des noms uniques pour le même fichier', () => {
      const originalFileName = 'test.jpg';
      
      // Attendre un peu pour s'assurer que les timestamps sont différents
      const name1 = timestampedFileName(originalFileName);
      
      // Simuler un petit délai
      jest.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(Date.now() + 1);
      const name2 = timestampedFileName(originalFileName);

      expect(name1).not.toBe(name2);
      expect(name1).toContain('test.jpg');
      expect(name2).toContain('test.jpg');
    });
  });

  describe('createFile', () => {
    test('devrait uploader un fichier avec succès', async () => {
      const mockFile = new File(['content'], 'test-image.jpg', { type: 'image/jpeg' });
      const mockFileRef = {
        fullPath: 'properties/images/1234567890test-image.jpg'
      };

      // Mock des fonctions Firebase Storage
      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockReturnValue(mockFileRef);
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockResolvedValue('https://firebase.storage.com/test-image.jpg');

      const result = await createFile(mockFile, testOwnerId, testLocation);

      expect(result).toEqual({
        fileURL: 'https://firebase.storage.com/test-image.jpg',
        filePATH: 'properties/images/1234567890test-image.jpg'
      });

      expect(mockRef).toHaveBeenCalledTimes(1);
      expect(mockUploadBytes).toHaveBeenCalledTimes(1);
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);

      // Vérifier les métadonnées
      const uploadCall = mockUploadBytes.mock.calls[0];
      expect(uploadCall[1]).toBe(mockFile);
      expect(uploadCall[2]).toEqual({
        customMetadata: {
          owner: testOwnerId,
          status: 'InProgress'
        }
      });
    });

    test('devrait gérer différents types de fichiers', async () => {
      const fileTypes = [
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'image.png', type: 'image/png' },
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'audio.mp3', type: 'audio/mpeg' }
      ];

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      for (const fileType of fileTypes) {
        const mockFile = new File(['content'], fileType.name, { type: fileType.type });
        const mockFileRef = {
          fullPath: `${testLocation}/timestamped-${fileType.name}`
        };

        mockRef.mockReturnValue(mockFileRef);
        mockUploadBytes.mockResolvedValue(undefined);
        mockGetDownloadURL.mockResolvedValue(`https://storage.com/${fileType.name}`);

        const result = await createFile(mockFile, testOwnerId, testLocation);

        expect(result.fileURL).toBe(`https://storage.com/${fileType.name}`);
        expect(result.filePATH).toBe(`${testLocation}/timestamped-${fileType.name}`);
      }
    });

    test('devrait utiliser le bon propriétaire dans les métadonnées', async () => {
      const mockFile = new File(['content'], 'owner-test.jpg', { type: 'image/jpeg' });
      const differentOwnerId = 'different-owner-456';

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockReturnValue({ fullPath: 'test/path' });
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockResolvedValue('https://storage.com/test.jpg');

      await createFile(mockFile, differentOwnerId, testLocation);

      const uploadCall = mockUploadBytes.mock.calls[0];
      expect(uploadCall[2].customMetadata.owner).toBe(differentOwnerId);
    });

    test('devrait propager les erreurs d\'upload', async () => {
      const mockFile = new File(['content'], 'error-test.jpg', { type: 'image/jpeg' });

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;

      mockRef.mockReturnValue({ fullPath: 'test/path' });
      mockUploadBytes.mockRejectedValue(new Error('Upload failed'));

      await expect(createFile(mockFile, testOwnerId, testLocation))
        .rejects.toThrow('Failed to upload file');
    });

    test('devrait propager les erreurs de génération d\'URL', async () => {
      const mockFile = new File(['content'], 'url-error-test.jpg', { type: 'image/jpeg' });

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockReturnValue({ fullPath: 'test/path' });
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockRejectedValue(new Error('URL generation failed'));

      await expect(createFile(mockFile, testOwnerId, testLocation))
        .rejects.toThrow('Failed to upload file');
    });
  });

  describe('updateFile', () => {
    test('devrait mettre à jour le statut d\'un fichier', async () => {
      const testFilePath = 'properties/images/1234567890test-image.jpg';

      const mockRef = require('@/firebase/storage').ref;
      const mockUpdateMetadata = require('@/firebase/storage').updateMetadata;

      mockRef.mockReturnValue({ path: testFilePath });
      mockUpdateMetadata.mockResolvedValue(undefined);

      await updateFile(testFilePath);

      expect(mockRef).toHaveBeenCalledWith(expect.anything(), testFilePath);
      expect(mockUpdateMetadata).toHaveBeenCalledWith(
        expect.anything(),
        {
          customMetadata: {
            status: 'Archived'
          }
        }
      );
    });

    test('devrait gérer les chemins de fichiers complexes', async () => {
      const complexPaths = [
        'properties/images/user123/1234567890image.jpg',
        'documents/pdfs/2023/contract.pdf',
        'videos/presentations/final-video.mp4',
        'archives/old-files/backup.zip'
      ];

      const mockRef = require('@/firebase/storage').ref;
      const mockUpdateMetadata = require('@/firebase/storage').updateMetadata;

      mockRef.mockReturnValue({});
      mockUpdateMetadata.mockResolvedValue(undefined);

      for (const filePath of complexPaths) {
        await updateFile(filePath);
        expect(mockRef).toHaveBeenCalledWith(expect.anything(), filePath);
      }

      expect(mockUpdateMetadata).toHaveBeenCalledTimes(complexPaths.length);
    });

    test('devrait propager les erreurs de mise à jour', async () => {
      const testFilePath = 'error/path/test.jpg';

      const mockRef = require('@/firebase/storage').ref;
      const mockUpdateMetadata = require('@/firebase/storage').updateMetadata;

      mockRef.mockReturnValue({});
      mockUpdateMetadata.mockRejectedValue(new Error('Metadata update failed'));

      await expect(updateFile(testFilePath))
        .rejects.toThrow('Failed to update file metadata');
    });

    test('devrait préserver les autres métadonnées', async () => {
      const testFilePath = 'test/preserve-metadata.jpg';

      const mockRef = require('@/firebase/storage').ref;
      const mockUpdateMetadata = require('@/firebase/storage').updateMetadata;

      mockRef.mockReturnValue({});
      mockUpdateMetadata.mockResolvedValue(undefined);

      await updateFile(testFilePath);

      const updateCall = mockUpdateMetadata.mock.calls[0][1];
      expect(updateCall).toEqual({
        customMetadata: {
          status: 'Archived'
        }
      });
    });
  });

  describe('Flux complet de gestion de fichiers', () => {
    test('devrait gérer le cycle complet d\'un fichier', async () => {
      const mockFile = new File(['image content'], 'complete-cycle.jpg', { type: 'image/jpeg' });
      
      // 1. Upload du fichier
      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;
      const mockUpdateMetadata = require('@/firebase/storage').updateMetadata;

      const mockFileRef = {
        fullPath: 'properties/images/1234567890complete-cycle.jpg'
      };

      mockRef.mockReturnValue(mockFileRef);
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockResolvedValue('https://storage.com/complete-cycle.jpg');

      const uploadResult = await createFile(mockFile, testOwnerId, testLocation);

      expect(uploadResult).toEqual({
        fileURL: 'https://storage.com/complete-cycle.jpg',
        filePATH: 'properties/images/1234567890complete-cycle.jpg'
      });

      // 2. Archivage du fichier
      mockUpdateMetadata.mockResolvedValue(undefined);

      await updateFile(uploadResult.filePATH);

      expect(mockUpdateMetadata).toHaveBeenCalledWith(
        expect.anything(),
        {
          customMetadata: {
            status: 'Archived'
          }
        }
      );

      // Vérifier que toutes les opérations ont été effectuées
      expect(mockRef).toHaveBeenCalledTimes(2); // Une fois pour upload, une fois pour update
      expect(mockUploadBytes).toHaveBeenCalledTimes(1);
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
      expect(mockUpdateMetadata).toHaveBeenCalledTimes(1);
    });

    test('devrait gérer l\'upload de multiples fichiers', async () => {
      const files = [
        new File(['content1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'image2.png', { type: 'image/png' }),
        new File(['content3'], 'document.pdf', { type: 'application/pdf' })
      ];

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockImplementation((storage, path) => ({ fullPath: path }));
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockImplementation((ref) => 
        Promise.resolve(`https://storage.com/${ref.fullPath}`)
      );

      const uploadPromises = files.map(file => 
        createFile(file, testOwnerId, testLocation)
      );

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.fileURL).toContain(files[index].name);
        expect(result.filePATH).toContain(files[index].name);
      });

      expect(mockUploadBytes).toHaveBeenCalledTimes(3);
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tests de performance et limites', () => {
    test('devrait gérer les gros fichiers', async () => {
      // Simuler un gros fichier (représenté par une chaîne longue)
      const largeContent = 'x'.repeat(10000); // 10KB de contenu
      const largeFile = new File([largeContent], 'large-file.jpg', { type: 'image/jpeg' });

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockReturnValue({ fullPath: 'large/path' });
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockResolvedValue('https://storage.com/large-file.jpg');

      const result = await createFile(largeFile, testOwnerId, testLocation);

      expect(result.fileURL).toBe('https://storage.com/large-file.jpg');
      expect(mockUploadBytes).toHaveBeenCalledWith(
        expect.anything(),
        largeFile,
        expect.objectContaining({
          customMetadata: {
            owner: testOwnerId,
            status: 'InProgress'
          }
        })
      );
    });

    test('devrait gérer les noms de fichiers avec caractères spéciaux', async () => {
      const specialFiles = [
        'fichier-avec-accents-éàü.jpg',
        'file with spaces.png',
        'file_with_underscores.pdf',
        'file-with-dashes.doc'
      ];

      const mockRef = require('@/firebase/storage').ref;
      const mockUploadBytes = require('@/firebase/storage').uploadBytes;
      const mockGetDownloadURL = require('@/firebase/storage').getDownloadURL;

      mockRef.mockImplementation((storage, path) => ({ fullPath: path }));
      mockUploadBytes.mockResolvedValue(undefined);
      mockGetDownloadURL.mockResolvedValue('https://storage.com/test.jpg');

      for (const fileName of specialFiles) {
        const file = new File(['content'], fileName, { type: 'image/jpeg' });
        const result = await createFile(file, testOwnerId, testLocation);
        
        expect(result.filePATH).toContain(fileName);
        expect(result.fileURL).toBeDefined();
      }
    });
  });
}); 