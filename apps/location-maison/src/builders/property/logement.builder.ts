/**
 * @module Builders/property
 */

import { Logement } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Abstract class to build a `Logement` object.
 * 
 * This class extends the `PropertyBuilder` class and adds specific attributes 
 * related to logement properties, such as the number of kitchens, bathrooms, and toilets.
 * It uses the builder pattern to allow flexible construction of a `Logement` object.
 * 
 * @abstract
 * @class LogementBuilder
 * @extends PropertyBuilder
 */
export abstract class LogementBuilder extends PropertyBuilder {
    /**
     * Constructor initializes the `LogementBuilder` with default values.
     * The initial values for `nbrChickens`, `nbrBathrooms`, and `nbrToilets` are set to 0.
     * 
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Logement',
            nbrRooms: 0,
            nbrChickens: 0,
            nbrBathrooms: 0,
            nbrToilets: 0
        } as Logement;
    }

    /**
     * Sets the number of kitchens in the logement.
     * 
     * @param {number} nbrChickens - The number of kitchens.
     * @returns {this} The current instance of `LogementBuilder`.
     */
    setNbrChickens(nbrChickens: number): this {
        (this.property as Logement).nbrChickens = nbrChickens;
        return this;
    }

    /**
     * Sets the number of bathrooms in the logement.
     * 
     * @param {number} nbrBathrooms - The number of bathrooms.
     * @returns {this} The current instance of `LogementBuilder`.
     */
    setNbrBathrooms(nbrBathrooms: number): this {
        (this.property as Logement).nbrBathrooms = nbrBathrooms;
        return this;
    }

    /**
     * Sets the number of toilets in the logement.
     * 
     * @param {number} nbrToilets - The number of toilets.
     * @returns {this} The current instance of `LogementBuilder`.
     */
    setNbrToilets(nbrToilets: number): this {
        (this.property as Logement).nbrToilets = nbrToilets;
        return this;
    }

    /**
     * Finalizes the construction of the `Logement` object and returns it.
     * 
     * @returns {Logement} The built `Logement` object.
     */
    build(): Logement {
        return this.property as Logement;
    }
}