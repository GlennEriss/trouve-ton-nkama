/**
 * @module Builders/property
 */

import { Home } from "@/models/annonce";
import { LogementBuilder } from "./logement.builder";

/**
 * Builder class to create a Home object.
 * 
 * This class extends the `LogementBuilder` to add specific attributes related 
 * to a home, such as the number of floors and garages. It allows for the flexible 
 * construction of a `Home` object using the builder pattern.
 * 
 * @class HomeBuilder
 * @extends LogementBuilder
 */
export class HomeBuilder extends LogementBuilder {
    /**
     * Protected constructor that initializes the `HomeBuilder` 
     * with default home property values.
     * 
     * @constructor
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Home',
            nbrFloors: 0,
            nbrGarages: 0,
            nbrLivingRoom: 0
        } as Home;
    }

    /**
     * Sets the number of floors in the home.
     * 
     * @param {number} nbrFloors - The number of floors in the home.
     * @returns {this} The current instance of `HomeBuilder`.
     */
    setNbrFloors(nbrFloors: number): this {
        (this.property as Home).nbrFloors = nbrFloors;
        return this;
    }

    /**
     * Sets the number of garages in the home.
     * 
     * @param {number} nbrGarages - The number of garages in the home.
     * @returns {this} The current instance of `HomeBuilder`.
     */
    setNbrGarages(nbrGarages: number): this {
        (this.property as Home).nbrGarages = nbrGarages;
        return this;
    }

    /**
     * Finalizes the construction and returns the built `Home` object.
     * 
     * @returns {Home} The built `Home` object.
     */
    build(): Home {
        return this.property as Home;
    }

    /**
     * Static method to create a new instance of the `HomeBuilder`.
     * 
     * @returns {HomeBuilder} A new instance of `HomeBuilder`.
     */
    static getInstance(): HomeBuilder {
        return new HomeBuilder();
    }
}