/**
 * @module Builders/property
 */

import { Property } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Property object.
 * 
 * This class extends the `PropertyBuilder` to provide a structured way to create 
 * a `Property` object using the builder pattern.
 * 
 * @class LandBuilder
 * @extends PropertyBuilder
 */
export class LandBuilder extends PropertyBuilder {
    /**
     * Protected constructor that initializes the `LandBuilder` 
     * with default land property values.
     * 
     * @constructor
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Land',
        } as Property;
    }

    /**
     * Finalizes the construction and returns the built `Land` object.
     * 
     * @returns {Property} The built `Land` object.
     */
    build(): Property {
        return this.property;
    }

    /**
     * Static method to create a new instance of the `LandBuilder`.
     * 
     * @returns {LandBuilder} A new instance of `LandBuilder`.
     */
    static getInstance(): LandBuilder {
        return new LandBuilder();
    }
}