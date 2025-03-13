/**
 * @module factories/property
 */

/**
 * Factory class responsible for creating an instance of ApartmentBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return an ApartmentBuilder instance.
 * 
 * @class ApartmentFactory
 * @implements {PropertyFactory}
 */
import { PropertyFactory } from "./property.factory";
import { ApartmentBuilder } from "@/builders/property/apartment.builder";

export class ApartmentFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of ApartmentBuilder.
     * This method uses the `getInstance()` static method from ApartmentBuilder to ensure the proper builder instance is returned.
     *
     * @returns {ApartmentBuilder} - A new instance of ApartmentBuilder.
     */
    createBuilder(): ApartmentBuilder {
        return ApartmentBuilder.getInstance();
    }
}