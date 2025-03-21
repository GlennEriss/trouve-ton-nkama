/**
 * @module factories/property
 */

import { ShopBuilder } from "@/builders/property/shop.builder";
import { PropertyFactory } from "./property.factory";

/**
 * Factory class responsible for creating an instance of ShopBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a ShopBuilder instance.
 * 
 * @class ShopFactory
 * @implements {PropertyFactory}
 */
export class ShopFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of ShopBuilder.
     * This method uses the `getInstance()` static method from ShopBuilder to ensure the proper builder instance is returned.
     *
     * @returns {ShopBuilder} - A new instance of ShopBuilder.
     */
    createBuilder(): ShopBuilder {
        return ShopBuilder.getInstance();
    }
}
