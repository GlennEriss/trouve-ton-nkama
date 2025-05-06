

/**
 * @module Builders/property-form
 */

import { PropertyFormBuilder } from "./property.form.builder";

/**
 * LandFormBuilder class is a concrete builder for creating a form related to land properties.
 * It extends `PropertyFormBuilder` to add specific fields for the type of land.
 * 
 * @class LandFormBuilder
 * @extends PropertyFormBuilder
 */
export class LandFormBuilder extends PropertyFormBuilder {

    /**
     * Private constructor that initializes form elements specific to lands for Step 2.
     * It adds the following field:
     * 
     * - `landSurface`: A text input for specifying the total land surface in m².
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
    }

    /**
     * Static method to get an instance of `LandFormBuilder`.
     * 
     * @returns {LandFormBuilder} A new instance of the `LandFormBuilder`.
     * 
     * @example
     * const landFormBuilder = LandFormBuilder.getInstance();
     * const formElements = landFormBuilder.build();
     */
    public static getInstance(): LandFormBuilder {
        return new LandFormBuilder();
    }
}