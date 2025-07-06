/**
 * Utilitaires pour la gestion des images
 */

import { Image } from '../types/annonce';
import { FirebaseServices } from '../firebase/config';
import { FIREBASE_STORAGE_PATHS } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Résultat d'upload d'image
 */
export interface ImageUploadResult {
  success: boolean;
  image?: Image;
  error?: string;
}

/**
 * Statistiques d'upload d'images
 */
export interface ImageUploadStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Informations sur un fichier image
 */
export interface ImageFileInfo {
  localPath: string;
  originalName: string;
  size: number;
  mimeType: string;
  isValid: boolean;
}

/**
 * Valide un fichier image
 */
export async function validateImageFile(filePath: string): Promise<ImageFileInfo> {
  try {
    const stats = await fs.stat(filePath);
    const originalName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Types MIME supportés
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const isValid = Object.keys(mimeTypes).includes(ext) && stats.size > 0 && stats.size < 10 * 1024 * 1024; // Max 10MB
    
    return {
      localPath: filePath,
      originalName,
      size: stats.size,
      mimeType,
      isValid
    };
  } catch (error) {
    return {
      localPath: filePath,
      originalName: path.basename(filePath),
      size: 0,
      mimeType: 'application/octet-stream',
      isValid: false
    };
  }
}

/**
 * Génère un nom de fichier unique pour Firebase Storage
 */
export function generateFirebaseFileName(originalName: string, propertyId: string): string {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  return `${propertyId}_${sanitizedBaseName}_${timestamp}${ext}`;
}

/**
 * Upload une image vers Firebase Storage
 */
export async function uploadImageToFirebase(
  firebase: FirebaseServices,
  localPath: string,
  propertyId: string
): Promise<ImageUploadResult> {
  try {
    // Validation du fichier
    const fileInfo = await validateImageFile(localPath);
    if (!fileInfo.isValid) {
      return {
        success: false,
        error: `Fichier image invalide: ${localPath}`
      };
    }

    // Génération du nom de fichier
    const fileName = generateFirebaseFileName(fileInfo.originalName, propertyId);
    const storagePath = `${FIREBASE_STORAGE_PATHS.PROPERTY_IMAGES}/${fileName}`;

    // Lecture du fichier
    const fileBuffer = await fs.readFile(localPath);

    // Upload vers Firebase Storage
    const bucket = firebase.storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: fileInfo.mimeType,
        cacheControl: 'public, max-age=31536000', // 1 an
      },
    });

    // Récupération de l'URL publique
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return {
      success: true,
      image: {
        filePATH: storagePath,
        fileURL: publicUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

/**
 * Upload plusieurs images pour une propriété
 */
export async function uploadImagesForProperty(
  firebase: FirebaseServices,
  localPaths: string[],
  propertyId: string,
  imagesDir: string
): Promise<{
  images: Image[];
  stats: ImageUploadStats;
}> {
  const images: Image[] = [];
  const stats: ImageUploadStats = {
    total: localPaths.length,
    success: 0,
    failed: 0,
    errors: []
  };

  console.log(`📸 Upload de ${localPaths.length} images pour la propriété ${propertyId}`);

  for (const localPath of localPaths) {
    // Construire le chemin complet en gérant les cas où localPath contient déjà le dossier
    let fullPath: string;
    if (localPath.startsWith('images/')) {
      // Le chemin contient déjà le dossier images/
      fullPath = localPath.replace('images/', imagesDir);
    } else {
      // Le chemin est relatif, on l'ajoute au dossier images
      fullPath = path.join(imagesDir, localPath);
    }
    
    try {
      const result = await uploadImageToFirebase(firebase, fullPath, propertyId);
      
      if (result.success && result.image) {
        images.push(result.image);
        stats.success++;
      } else {
        stats.failed++;
        stats.errors.push(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      stats.failed++;
      stats.errors.push(`Erreur pour ${localPath}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  console.log(`✅ Upload terminé: ${stats.success}/${stats.total} images uploadées`);
  return { images, stats };
}

/**
 * Vérifie si une image existe déjà dans Firebase Storage
 */
export async function imageExistsInFirebase(
  firebase: FirebaseServices,
  storagePath: string
): Promise<boolean> {
  try {
    const bucket = firebase.storage.bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * Supprime une image de Firebase Storage
 */
export async function deleteImageFromFirebase(
  firebase: FirebaseServices,
  storagePath: string
): Promise<boolean> {
  try {
    const bucket = firebase.storage.bucket();
    const file = bucket.file(storagePath);
    await file.delete();
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression de ${storagePath}:`, error);
    return false;
  }
}

/**
 * Redimensionne une image (si sharp est disponible)
 */
export async function resizeImageIfNeeded(
  inputPath: string,
  outputPath: string,
  maxWidth: number = 1200,
  maxHeight: number = 800
): Promise<boolean> {
  try {
    // Tentative d'import de sharp
    const sharp = await import('sharp');
    
    await sharp.default(inputPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.warn('Sharp non disponible, pas de redimensionnement:', error);
    // Copie le fichier original si sharp n'est pas disponible
    await fs.copyFile(inputPath, outputPath);
    return false;
  }
}

/**
 * Nettoie les fichiers temporaires
 */
export async function cleanupTempFiles(tempDir: string): Promise<void> {
  try {
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      await fs.unlink(path.join(tempDir, file));
    }
    await fs.rmdir(tempDir);
  } catch (error) {
    console.warn('Erreur lors du nettoyage des fichiers temporaires:', error);
  }
}

/**
 * Génère des statistiques sur les images
 */
export function generateImageStats(
  uploadResults: ImageUploadResult[]
): ImageUploadStats {
  const stats: ImageUploadStats = {
    total: uploadResults.length,
    success: 0,
    failed: 0,
    errors: []
  };

  uploadResults.forEach(result => {
    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
      if (result.error) {
        stats.errors.push(result.error);
      }
    }
  });

  return stats;
}

/**
 * Analyse les images locales disponibles
 */
export async function analyzeLocalImages(imagesDir: string): Promise<{
  totalImages: number;
  validImages: number;
  invalidImages: number;
  totalSize: number;
  imagesByProperty: Map<string, string[]>;
}> {
  try {
    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file));
    
    let validImages = 0;
    let invalidImages = 0;
    let totalSize = 0;
    const imagesByProperty = new Map<string, string[]>();

    for (const file of imageFiles) {
      const filePath = path.join(imagesDir, file);
      const fileInfo = await validateImageFile(filePath);
      
      if (fileInfo.isValid) {
        validImages++;
        totalSize += fileInfo.size;
        
        // Extrait l'ID de la propriété depuis le nom du fichier
        const parts = file.split('_');
        const propertyId = parts.length > 0 ? parts[0] : null;
        
        if (propertyId) {
          if (!imagesByProperty.has(propertyId)) {
            imagesByProperty.set(propertyId, []);
          }
          imagesByProperty.get(propertyId)!.push(file);
        }
      } else {
        invalidImages++;
      }
    }

    return {
      totalImages: imageFiles.length,
      validImages,
      invalidImages,
      totalSize,
      imagesByProperty
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse des images:', error);
    return {
      totalImages: 0,
      validImages: 0,
      invalidImages: 0,
      totalSize: 0,
      imagesByProperty: new Map()
    };
  }
} 