/**
 * @module db
 */

import { Image } from "@/models/annonce";

const getStorage = () => import("@/firebase/storage");

/**
 * Generates a unique file name by appending a timestamp to the original file name.
 * 
 * This function uses the current Unix timestamp (the number of milliseconds since January 1, 1970)
 * and concatenates it with the specified file name, ensuring that the file name is unique 
 * based on the time it was generated.
 * 
 * @param {string} fileName - The original file name to be modified.
 * @returns {string} - A new file name with the timestamp added as a prefix.
 */
export function timestampedFileName(fileName: string): string {
    return `${new Date().valueOf()}${fileName}`;
}

/**
 * Uploads a file to a specified location in cloud storage and generates a download URL.
 * 
 * This function uploads a file to the specified `location` in cloud storage, using the 
 * `ownerId` for custom metadata to track ownership and status. A timestamp is appended 
 * to the file name to ensure uniqueness.
 * 
 * @param {File} file - The file to be uploaded.
 * @param {string} ownerId - The ID of the owner of the file, stored in the file metadata.
 * @param {string} location - The storage location where the file will be uploaded.
 * @returns {Promise<Image}>} - Returns an object containing the file URL and its storage path.
 * @throws {Error} - Throws an error if the file upload or URL generation fails.
 */
export async function createFile(file: File, ownerId: string, location: string): Promise<Image> {
    try {
        const { storage, ref, uploadBytes, getDownloadURL } = await getStorage();
        // Create a storage reference with a unique name
        let fileRef = ref(
            storage,
            `${location}/${timestampedFileName(file.name)}`
        );
        let filePATH = fileRef.fullPath;

        // File metadata including owner information
        const metadata = {
            customMetadata: {
                owner: ownerId,
                status: 'InProgress'
            },
        };
        // Upload the file with metadata
        await uploadBytes(fileRef, file, metadata);

        // Get the download URL after upload
        const fileURL = await getDownloadURL(fileRef);

        return { fileURL, filePATH };
    } catch (error) {
        console.error("File upload failed:", error);
        throw new Error("Failed to upload file");
    }
}

/**
 * Updates the status of a file to "Archived" in cloud storage metadata.
 * 
 * This function updates the custom metadata of a file in cloud storage to set its status 
 * to "Archived". It retrieves the existing file, updates its metadata, and re-applies 
 * the new metadata.
 * 
 * @param {string} filePath - The full path of the file in storage.
 * @returns {Promise<void>} - Resolves once the status has been updated.
 * @throws {Error} - Throws an error if the update fails.
 */
export async function updateFile(filePath: string): Promise<void> {
    try {
        const { storage, ref, updateMetadata } = await getStorage();

        // Reference to the file in storage
        const fileRef = ref(storage, filePath);

        // Update the custom metadata status to "Archived"
        const newMetadata = {
            customMetadata: {
                status: 'Archived',
            },
        };

        // Apply the updated metadata to the file
        await updateMetadata(fileRef, newMetadata);
    } catch (error) {
        console.error("Failed to update file status:", error);
        throw new Error("Failed to update file metadata");
    }
}