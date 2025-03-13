/**
 * @module Builders/property
 */

import { Desk } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Desk object.
 * 
 * This class extends the `PropertyBuilder` and provides specific methods 
 * for setting desk-related attributes like the number of toilets and rooms.
 * It follows the builder pattern to allow the construction of the `Desk` object in a flexible way.
 * 
 * @class DeskBuilder
 * @extends PropertyBuilder
 */
export class DeskBuilder extends PropertyBuilder {
    /**
     * Private constructor that initializes the `DeskBuilder` 
     * with default desk property values.
     * 
     * @constructor
     * @private
     */
    private constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Desk',
            nbrToilets: 0,
            nbrRooms: 0
        } as Desk;
    }

    /**
     * Sets the number of toilets in the desk.
     * 
     * @param {number} nbrToilets - The number of toilets in the desk property.
     * @returns {DeskBuilder} The current instance of `DeskBuilder`.
     */
    setNbrToilets(nbrToilets: number): DeskBuilder {
        (this.property as Desk).nbrToilets = nbrToilets;
        return this;
    }

    /**
     * Sets the number of rooms in the desk.
     * 
     * @param {number} nbrRooms - The number of rooms in the desk property.
     * @returns {DeskBuilder} The current instance of `DeskBuilder`.
     */
    setNbrRooms(nbrRooms: number): DeskBuilder {
        (this.property as Desk).nbrRooms = nbrRooms;
        return this;
    }

    /**
     * Finalizes the construction and returns the built `Desk` object.
     * 
     * @returns {Desk} The built `Desk` object.
     */
    build(): Desk {
        return this.property as Desk;
    }

    /**
     * Static method to create a new instance of the `DeskBuilder`.
     * 
     * @returns {DeskBuilder} A new instance of `DeskBuilder`.
     */
    static getInstance(): DeskBuilder {
        return new DeskBuilder();
    }
}