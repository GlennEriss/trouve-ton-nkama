/**
 * @module factories/property-form
 */
import { BuildingFormBuilder } from "@/builders/property-form/building.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `BuildingFormFactory` class is responsible for creating an instance of the `BuildingFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a building-specific form builder that contains form elements for properties like the number of floors, apartments, and parking spaces.
 * 
 * @class BuildingFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class BuildingFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `BuildingFormBuilder`.
     * 
     * @returns {BuildingFormBuilder} An instance of the `BuildingFormBuilder` used to build forms specific to buildings.
     * 
     * @example
     * const buildingFactory = new BuildingFormFactory();
     * const builder = buildingFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): BuildingFormBuilder {
        return BuildingFormBuilder.getInstance();
    }
}