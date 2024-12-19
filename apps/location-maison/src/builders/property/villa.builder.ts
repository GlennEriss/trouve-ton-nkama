/**
 * @module Builders/property
 */

import { Villa } from "@/models/annonce";
import { HomeBuilder } from "./home.builder";

/**
 * Builder class for constructing `Villa` objects.
 * This class extends the `HomeBuilder` and provides additional methods for configuring 
 * villa-specific attributes, such as the number of pools (`nbrPiscine`).
 * 
 * @class VillaBuilder
 * @extends HomeBuilder
 */
export class VillaBuilder extends HomeBuilder {
    /**
     * Private constructor for initializing a `VillaBuilder` instance.
     * The property type is set to 'Villa', and the number of pools (`nbrPiscine`) is initialized 
     * with a default value of 0.
     * 
     * @private
     */
    private constructor(){
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Villa',
            nbrPiscine: 0
        } as Villa;
    }

    /**
     * Sets the number of pools for the villa.
     * 
     * @param {number} nbrPiscine - The number of pools.
     * @returns {VillaBuilder} The current instance of `VillaBuilder` to allow method chaining.
     */
    setNbrPiscine(nbrPiscine: number){
        (this.property as Villa).nbrPiscine = nbrPiscine;
        return this;
    }

    /**
     * Finalizes the construction of the `Villa` object and returns it.
     * 
     * @returns {Villa} The built `Villa` object.
     */
    build(): Villa {
        return this.property as Villa;
    }

    /**
     * Static method to create and return a new instance of `VillaBuilder`.
     * 
     * @returns {VillaBuilder} A new instance of `VillaBuilder`.
     */
    static getInstance(): VillaBuilder {
        return new VillaBuilder();
    }
}