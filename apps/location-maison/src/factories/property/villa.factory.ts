/**
 * @module factories/property
 */

import { PropertyFactory } from "./property.factory";
import { VillaBuilder } from "@/builders/property/villa.builder";

/**
 * Factory class for creating VillaBuilder instances.
 * Implements the PropertyFactory interface to generate builders specific to villa properties.
 * 
 * @class VillaFactory
 * @implements {PropertyFactory}
 */
export class VillaFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of VillaBuilder.
     * 
     * @returns {VillaBuilder} - A new instance of VillaBuilder.
     */
    createBuilder(): VillaBuilder {
        return VillaBuilder.getInstance();
    }
}