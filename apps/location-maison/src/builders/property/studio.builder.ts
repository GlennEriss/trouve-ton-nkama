/**
 * @module Builders/property
 */

import { Studio } from "@/models/annonce";
import { LogementBuilder } from "./logement.builder";

/**
 * Builder class for constructing `Studio` objects.
 * This class extends the `LogementBuilder` and provides additional methods for configuring 
 * studio-specific attributes such as the floor number and studio number.
 * 
 * @class StudioBuilder
 * @extends LogementBuilder
 */
export class StudioBuilder extends LogementBuilder {
    /**
     * Private constructor for initializing a `StudioBuilder` instance.
     * The property type is set to 'Studio', and the number of floors and studio number 
     * are initialized with default values.
     * 
     * @private
     */
    private constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Studio',
            nbrFloorStudio: 0,
            numeroStudio: '01'
        } as Studio;
    }

    /**
     * Sets the floor number of the studio.
     * 
     * @param {number} nbrFloorStudio - The floor number where the studio is located.
     * @returns {StudioBuilder} The current instance of `StudioBuilder` to allow method chaining.
     */
    setNbrFloorStudio(nbrFloorStudio: number) {
        (this.property as Studio).nbrFloorStudio = nbrFloorStudio;
        return this;
    }

    /**
     * Sets the studio number.
     * 
     * @param {string} numeroStudio - The studio's unique number.
     * @returns {StudioBuilder} The current instance of `StudioBuilder` to allow method chaining.
     */
    setNumeroStudio(numeroStudio: string) {
        (this.property as Studio).numeroStudio = numeroStudio;
        return this;
    }

    /**
     * Finalizes the construction of the `Studio` object and returns it.
     * 
     * @returns {Studio} The built `Studio` object.
     */
    build(): Studio {
        return this.property as Studio;
    }

    /**
     * Static method to create and return a new instance of `StudioBuilder`.
     * 
     * @returns {StudioBuilder} A new instance of `StudioBuilder`.
     */
    static getInstance(): StudioBuilder {
        return new StudioBuilder();
    }
}