/**
 * @module factories/property
 */

import { PropertyFactory } from "./property.factory";
import { StudioBuilder } from "@/builders/property/studio.builder";

/**
 * Factory class for creating StudioBuilder instances.
 * Implements the PropertyFactory interface to generate builders specific to studio properties.
 * 
 * @class StudioFactory
 * @implements {PropertyFactory}
 */
export class StudioFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of StudioBuilder.
     * 
     * @returns {StudioBuilder} - A new instance of StudioBuilder.
     */
    createBuilder(): StudioBuilder {
        return StudioBuilder.getInstance();
    }
}