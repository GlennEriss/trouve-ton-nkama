/**
 * @module Builders/property
 */

import { Building } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Building object.
 * 
 * This class extends the `PropertyBuilder` and provides specific methods for setting 
 * building-related attributes such as the number of apartments, floors, and whether the building has parking.
 * Implements the builder pattern for fluent construction of the `Building` object.
 * 
 * @class BuildingBuilder
 * @extends PropertyBuilder
 */
export class BuildingBuilder extends PropertyBuilder {
    /**
     * Private constructor that initializes the `BuildingBuilder` 
     * with default building property values.
     * 
     * @constructor
     * @private
     */
    private constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Building',
            nbrApartments: 0,
            nbrFloors: 0,
            hasParking: 0
        } as Building;
    }

    /**
     * Sets the number of apartments in the building.
     * 
     * @param {number} nbrApartments - The number of apartments in the building.
     * @returns {BuildingBuilder} The current instance of `BuildingBuilder`.
     */
    setNbrApartments(nbrApartments: number): BuildingBuilder {
        (this.property as Building).nbrApartments = nbrApartments;
        return this;
    }

    /**
     * Sets the number of floors in the building.
     * 
     * @param {number} nbrFloors - The number of floors in the building.
     * @returns {BuildingBuilder} The current instance of `BuildingBuilder`.
     */
    setNbrFloors(nbrFloors: number): BuildingBuilder {
        (this.property as Building).nbrFloors = nbrFloors;
        return this;
    }

    /**
     * Sets whether the building has parking.
     * 
     * @param {number} hasParking - The number representing whether the building has parking (0 for no, 1 for yes).
     * @returns {BuildingBuilder} The current instance of `BuildingBuilder`.
     */
    setHasParking(hasParking: number): BuildingBuilder {
        (this.property as Building).hasParking = hasParking;
        return this;
    }

    /**
     * Finalizes the construction and returns the built `Building` object.
     * 
     * @returns {Building} The built `Building` object.
     */
    build(): Building {
        return this.property as Building;
    }

    /**
     * Static method to create a new instance of the `BuildingBuilder`.
     * 
     * @returns {BuildingBuilder} A new instance of `BuildingBuilder`.
     */
    static getInstance(): BuildingBuilder {
        return new BuildingBuilder();
    }
}