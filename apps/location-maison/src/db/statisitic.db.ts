/**
 * @module db
 */

import { collectionFirebaseNames } from "@/constantes";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.statistics');

const getFirestore = () => import("@/firebase/firestore");

/**
 * Generic function to count the number of documents in a Firestore collection based on dynamic filters.
 * This function leverages Firestore's CountServer to retrieve the number of matching documents without fetching the actual data.
 * 
 * @param {Firestore} db - The Firestore instance to use.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>} filters - An array of filter objects to apply. Each filter object should have a `field` (the document field), an `operator` (comparison operator), and a `value` (the value to compare against).
 * 
 * @returns {Promise<number>} - Returns a promise that resolves to the number of documents matching the given criteria.
 * 
 * @throws {Error} - Throws an error if the counting process fails.
 */
export async function countDocumentsWithFilters(
    collectionName: string,
    filters: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: any }>
): Promise<number> {
    const { collection, query, db, where, getCountFromServer } = await getFirestore();

    try {
        const collectionRef = collection(db, collectionName);

        // Build the query dynamically based on the provided filters
        let q = query(collectionRef);

        filters.forEach((filter) => {
            q = query(q, where(filter.field, filter.operator, filter.value));
        });

        // Use getCountFromServer to retrieve the document count
        const snapshot = await getCountFromServer(q);

        return snapshot.data().count;
    } catch (error) {
        logger.error('Error counting documents', { collectionName, filters, error });
        throw new Error("Failed to count documents.");
    }
}

/**
 * Function to count the number of properties in the Firestore collection.
 * This function calls the generic `countDocumentsWithFilters` function to count all documents 
 * in the "properties" collection.
 * 
 * @returns {Promise<number>} - Returns a promise that resolves to the number of property documents in the collection.
 * 
 * @throws {Error} - Throws an error if the document counting process fails.
 */
export async function countProperty(): Promise<number> {
    return await countDocumentsWithFilters(
        collectionFirebaseNames.properties,
        []
    )
}

/**
 * Function to count the number of properties in the Firestore collection where the state is 'Archived'.
 * This function calls the generic `countDocumentsWithFilters` function to count documents 
 * in the "properties" collection with the condition `state == 'Archived'`.
 * 
 * @returns {Promise<number>} - Returns a promise that resolves to the number of property documents with the 'Archived' state.
 * 
 * @throws {Error} - Throws an error if the document counting process fails.
 */
export async function countPropertyArchived() {
    return await countDocumentsWithFilters(
      collectionFirebaseNames.properties,
      [{ field: 'state', operator: '==', value: 'Archived' }]
    );
  }
  
  /**
   * Function to count the number of properties in the Firestore collection where the state is 'InProgress'.
   * This function calls the generic `countDocumentsWithFilters` function to count documents 
   * in the "properties" collection with the condition `state == 'InProgress'`.
   * 
   * @returns {Promise<number>} - Returns a promise that resolves to the number of property documents with the 'InProgress' state.
   * 
   * @throws {Error} - Throws an error if the document counting process fails.
   */
  export async function countPropertyInProgress() {
    return await countDocumentsWithFilters(
      collectionFirebaseNames.properties,
      [{ field: 'state', operator: '==', value: 'InProgress' }]
    );
  }
