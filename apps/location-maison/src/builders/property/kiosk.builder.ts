/**
 * @module Builders/property
 */

import { Kiosk } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Kiosk object.
 * 
 * This class extends the `PropertyBuilder` to provide a structured way to create 
 * a `Kiosk` object using the builder pattern.
 * 
 * @class KioskBuilder
 * @extends PropertyBuilder
 */
export class KioskBuilder extends PropertyBuilder {
    /**
     * Protected constructor that initializes the `KioskBuilder` 
     * with default kiosk property values.
     * 
     * @constructor
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Kiosk',
            kioskType: 'Alimentaire'
        } as Kiosk;
    }

    /**
     * Finalizes the construction and returns the built `Kiosk` object.
     * 
     * @returns {Kiosk} The built `Kiosk` object.
     */
    build(): Kiosk {
        return this.property as Kiosk;
    }

    /**
     * Static method to create a new instance of the `KioskBuilder`.
     * 
     * @returns {KioskBuilder} A new instance of `KioskBuilder`.
     */
    static getInstance(): KioskBuilder {
        return new KioskBuilder();
    }
}
