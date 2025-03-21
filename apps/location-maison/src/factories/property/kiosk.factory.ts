/**
 * @module factories/property
 */

import { KioskBuilder } from "@/builders/property/kiosk.builder";
import { PropertyFactory } from "./property.factory";

/**
 * Factory class responsible for creating an instance of KioskBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a KioskBuilder instance.
 * 
 * @class KioskFactory
 * @implements {PropertyFactory}
 */
export class KioskFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of KioskBuilder.
     * This method uses the `getInstance()` static method from KioskBuilder to ensure the proper builder instance is returned.
     *
     * @returns {KioskBuilder} - A new instance of KioskBuilder.
     */
    createBuilder(): KioskBuilder {
        return KioskBuilder.getInstance();
    }
}
