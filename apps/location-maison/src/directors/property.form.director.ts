/**
 * @module directors
 */

import { FormElement, PropertyFormBuilder } from "@/builders/property-form/property.form.builder";
import { PropertyFormBuilderFactory } from "@/factories/property-form/property.form.factory";

/**
 * The `PropertyFormDirector` class is responsible for managing the construction process
 * of a property form using a specific builder. It interacts with the `PropertyFormBuilderFactory`
 * to get the appropriate builder instance and delegates the form-building process to that builder.
 * 
 * @class PropertyFormDirector
 */
export class PropertyFormDirector {
    /**
     * The form builder instance created by the factory.
     * 
     * @private
     * @type {PropertyFormBuilder}
     */
    private builder: PropertyFormBuilder;

    /**
     * Constructor to initialize the `PropertyFormDirector` with a specific factory.
     * It creates the form builder using the factory provided.
     * 
     * @param {PropertyFormBuilderFactory} factory - The factory that creates the specific form builder.
     */
    constructor(factory: PropertyFormBuilderFactory) {
        this.builder = factory.createFormBuilder();
    }

    /**
     * Builds the form by using the builder instance to return an array of form elements.
     * 
     * @returns {FormElement[]} An array of form elements that have been built.
     * 
     * @example
     * const director = new PropertyFormDirector(new SomeFormBuilderFactory());
     * const formElements = director.build();
     */
    build(): FormElement[] {
        return this.builder.build(); 
    }
}