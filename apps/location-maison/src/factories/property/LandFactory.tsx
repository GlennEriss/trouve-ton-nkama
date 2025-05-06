/**
 * @module factories/property
 */

import { LandBuilder } from "@/builders/property/land.builder";
import { PropertyFactory } from "./property.factory";

/**
 * Factory class for creating LandBuilder instances.
 * Implements the PropertyFactory interface to generate builders specific to land properties.
 * 
 * @class LandFactory
 * @implements {PropertyFactory}
 */
export class LandFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of LandBuilder.
     * 
     * @returns {LandBuilder} - A new instance of LandBuilder.
     */
    createBuilder(): LandBuilder {
        return LandBuilder.getInstance();
    }
}
