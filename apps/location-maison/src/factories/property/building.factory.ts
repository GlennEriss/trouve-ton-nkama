/**
 * @module factories/property
 */

/**
 * Factory class responsible for creating an instance of BuildingBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a BuildingBuilder instance.
 * 
 * @class BuildingFactory
 * @implements {PropertyFactory}
 */
import { PropertyFactory } from "./property.factory";
import { BuildingBuilder } from "@/builders/property/building.builder";

export class BuildingFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of BuildingBuilder.
     * This method uses the `getInstance()` static method from BuildingBuilder to ensure the proper builder instance is returned.
     *
     * @returns {BuildingBuilder} - A new instance of BuildingBuilder.
     */
    createBuilder(): BuildingBuilder {
        return BuildingBuilder.getInstance();
    }
}