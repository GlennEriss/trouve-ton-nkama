

/**
 * @module factories/property-form
 */
import { LandFormBuilder } from "@/builders/property-form/land.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `LandFormFactory` class is responsible for creating an instance of the `LandFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a land-specific form builder that contains form elements for properties related to lands.
 * 
 * @class LandFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class LandFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `LandFormBuilder`.
     * 
     * @returns {LandFormBuilder} An instance of the `LandFormBuilder` used to build forms specific to land properties.
     * 
     * @example
     * const landFactory = new LandFormFactory();
     * const builder = landFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): LandFormBuilder {
        return LandFormBuilder.getInstance();
    }
}