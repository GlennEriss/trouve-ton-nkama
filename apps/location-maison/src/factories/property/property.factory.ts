/**
 * @module factories/property
 */

/**
 * Interface for property factories.
 * Every factory implementing this interface should provide a method to create a PropertyBuilder.
 * 
 * @interface PropertyFactory
 */
import { PropertyBuilder } from "@/builders/property/property.builder";

export interface PropertyFactory {
    /**
     * Creates and returns a PropertyBuilder.
     * 
     * @returns {PropertyBuilder} - A new instance of PropertyBuilder.
     */
    createBuilder(): PropertyBuilder;
}