/**
 * @module Builders/property
 */

import { Apartment } from "@/models/annonce";
import { LogementBuilder } from "./logement.builder";

/**
 * Builder class to create an Apartment object.
 * 
 * This class extends the `LogementBuilder` and provides specific methods for setting 
 * apartment-related attributes such as the number of floors and apartment number. 
 * Implements the builder pattern for fluent construction of the `Apartment` object.
 * 
 * @class ApartmentBuilder
 * @extends LogementBuilder
 */
export class ApartmentBuilder extends LogementBuilder {
    /**
     * Private constructor that initializes the `ApartmentBuilder` 
     * with default apartment property values.
     * 
     * @constructor
     * @private
     */
    private constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Apartment',
            nbrFloorApartment: 0,
            numeroApartment: '01'
        } as Apartment;
    }

    /**
     * Sets the number of floors in the apartment.
     * 
     * @param {number} nbrFloorApartment - The number of floors in the apartment.
     * @returns {this} The current instance of `ApartmentBuilder`.
     */
    setNbrFloorApartment(nbrFloorApartment: number): this {
        (this.property as Apartment).nbrFloorApartment = nbrFloorApartment;
        return this;
    }

    /**
     * Sets the apartment number.
     * 
     * @param {string} numeroApartment - The apartment number.
     * @returns {this} The current instance of `ApartmentBuilder`.
     */
    setNumeroApartment(numeroApartment: string): this {
        (this.property as Apartment).numeroApartment = numeroApartment;
        return this;
    }

    /**
     * Finalizes the construction and returns the built `Apartment` object.
     * 
     * @returns {Apartment} The built `Apartment` object.
     */
    build(): Apartment {
        return this.property as Apartment;
    }

    /**
     * Static method to create a new instance of the `ApartmentBuilder`.
     * 
     * @returns {ApartmentBuilder} A new instance of `ApartmentBuilder`.
     */
    static getInstance(): ApartmentBuilder {
        return new ApartmentBuilder();
    }
}