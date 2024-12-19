/**
 * StudioFormFactory Class
 * 
 * This class implements the PropertyFormBuilderFactory interface and is responsible
 * for creating an instance of StudioFormBuilder. The factory pattern ensures that
 * the creation logic of form builders is centralized, making the code more modular 
 * and easier to extend.
 * 
 * @class StudioFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
import { VillaFormBuilder } from "@/builders/property-form/villa.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `VillaFormFactory` class is responsible for creating an instance of the `VillaFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a villa-specific form builder that contains form elements for properties like the number of floors, garages, and swimming pools.
 * 
 * @class VillaFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class VillaFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `VillaFormBuilder`.
     * 
     * @returns {VillaFormBuilder} An instance of the `VillaFormBuilder` used to build forms specific to villa properties.
     * 
     * @example
     * const villaFactory = new VillaFormFactory();
     * const builder = villaFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): VillaFormBuilder {
        return VillaFormBuilder.getInstance();
    }
}