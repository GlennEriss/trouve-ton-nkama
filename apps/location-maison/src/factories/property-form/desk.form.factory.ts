/**
 * @module factories/property-form
 */
import { PropertyFormBuilderFactory } from "./property.form.factory";
import { DeskFormBuilder } from "@/builders/property-form/desk.form.builder";

/**
 * The `DeskFormFactory` class is responsible for creating an instance of the `DeskFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a desk-specific form builder that contains form elements for properties related to desk spaces, such as the number of rooms and toilets.
 * 
 * @class DeskFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class DeskFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `DeskFormBuilder`.
     * 
     * @returns {DeskFormBuilder} An instance of the `DeskFormBuilder` used to build forms specific to desk properties.
     * 
     * @example
     * const deskFactory = new DeskFormFactory();
     * const builder = deskFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): DeskFormBuilder {
        return DeskFormBuilder.getInstance();
    }
}