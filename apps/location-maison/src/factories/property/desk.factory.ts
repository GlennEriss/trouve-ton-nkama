/**
 * @module factories/property
 */

/**
 * Factory class responsible for creating an instance of DeskBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a DeskBuilder instance.
 * 
 * @class DeskFactory
 * @implements {PropertyFactory}
 */
import { PropertyFactory } from "./property.factory";
import { DeskBuilder } from "@/builders/property/desk.builder";

export class DeskFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of DeskBuilder.
     * This method uses the `getInstance()` static method from DeskBuilder to ensure the proper builder instance is returned.
     *
     * @returns {DeskBuilder} - A new instance of DeskBuilder.
     */
    createBuilder(): DeskBuilder {
        return DeskBuilder.getInstance();
    }
}