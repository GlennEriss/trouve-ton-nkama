/**
 * @module factories/property-form
 */
import { HomeFormBuilder } from "@/builders/property-form/home.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `HomeFormFactory` class is responsible for creating an instance of the `HomeFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a home-specific form builder that contains form elements for properties like the number of floors, garages, and other home-related attributes.
 * 
 * @class HomeFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class HomeFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `HomeFormBuilder`.
     * 
     * @returns {HomeFormBuilder} An instance of the `HomeFormBuilder` used to build forms specific to home properties.
     * 
     * @example
     * const homeFactory = new HomeFormFactory();
     * const builder = homeFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): HomeFormBuilder {
        return HomeFormBuilder.getInstance();
    }
}