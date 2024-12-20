/**
 * @module factories/property-form
 */
import { ApartmentFormBuilder } from "@/builders/property-form/apartment.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `ApartmentFormFactory` class is responsible for creating an instance of the `ApartmentFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, adhering to the factory pattern.
 * 
 * This factory creates an apartment-specific form builder.
 * 
 * @class ApartmentFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class ApartmentFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `ApartmentFormBuilder`.
     * 
     * @returns {ApartmentFormBuilder} An instance of the `ApartmentFormBuilder`.
     * 
     * @example
     * const apartmentFactory = new ApartmentFormFactory();
     * const builder = apartmentFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): ApartmentFormBuilder {
        return ApartmentFormBuilder.getInstance();
    }
}