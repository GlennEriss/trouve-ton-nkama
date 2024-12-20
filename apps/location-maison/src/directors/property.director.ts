/**
 * @module directors
 */

/**
 * Class PropertyDirector
 * This class acts as a director for constructing properties using a builder pattern.
 * It uses the PropertyFactory to create an appropriate builder and then orchestrates the building process.
 */
import { PropertyBuilder } from "@/builders/property/property.builder";
import { PropertyFactory } from "@/factories/property/property.factory";

export class PropertyDirector {
    /**
     * The builder instance used to construct the property.
     * @type {PropertyBuilder}
     */
    private builder: PropertyBuilder;

    /**
     * Constructor for PropertyDirector.
     * Accepts a factory to create the builder for constructing the property.
     * 
     * @param {PropertyFactory} factory - The factory used to create the appropriate builder for the property.
     */
    constructor(factory: PropertyFactory) {
        this.builder = factory.createBuilder();
    }

    /**
     * Triggers the building process by invoking the build method of the builder.
     * 
     * @returns {Property} - The fully built property object.
     */
    build() {
        return this.builder.build();
    }
}