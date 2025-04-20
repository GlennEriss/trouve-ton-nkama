/**
 * @module Builders/property
 */

import { Shop } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Shop object.
 * 
 * This class extends the `PropertyBuilder` to provide a structured way to create 
 * a `Shop` object using the builder pattern.
 * 
 * @class ShopBuilder
 * @extends PropertyBuilder
 */
export class ShopBuilder extends PropertyBuilder {
    /**
     * Protected constructor that initializes the `ShopBuilder` 
     * with default shop property values.
     * 
     * @constructor
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Shop',
            nbrRooms: 0,
            nbrToilet: 0
        } as Shop;
    }

    /**
     * Finalizes the construction and returns the built `Shop` object.
     * 
     * @returns {Shop} The built `Shop` object.
     */
    build(): Shop {
        return this.property as Shop;
    }

    /**
     * Static method to create a new instance of the `ShopBuilder`.
     * 
     * @returns {ShopBuilder} A new instance of `ShopBuilder`.
     */
    static getInstance(): ShopBuilder {
        return new ShopBuilder();
    }
}
