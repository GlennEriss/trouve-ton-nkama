/**
 * @module factories/property
 */

/**
 * Factory class responsible for creating an instance of HomeBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a HomeBuilder instance.
 * 
 * @class HomeFactory
 * @implements {PropertyFactory}
 */
import { HomeBuilder } from "@/builders/property/home.builder";
import { PropertyFactory } from "./property.factory";

export class HomeFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of HomeBuilder.
     * This method uses the `getInstance()` static method from HomeBuilder to ensure the proper builder instance is returned.
     *
     * @returns {HomeBuilder} - A new instance of HomeBuilder.
     */
    createBuilder(): HomeBuilder {
        return HomeBuilder.getInstance();
    }
}