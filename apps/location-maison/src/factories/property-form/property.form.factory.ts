/**
 * @module factories/property-form
 */
import { PropertyFormBuilder } from "@/builders/property-form/property.form.builder";

/**
 * The `PropertyFormBuilderFactory` interface defines a contract for creating instances of `PropertyFormBuilder`.
 * Classes that implement this interface will provide specific implementations of the `createFormBuilder` method, 
 * which returns a `PropertyFormBuilder` instance.
 * 
 * This interface is used in conjunction with the Factory Pattern to instantiate different types of property form builders,
 * depending on the specific form requirements (e.g., homes, apartments, offices, etc.).
 * 
 * @interface PropertyFormBuilderFactory
 */
export interface PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of a `PropertyFormBuilder`.
     * 
     * @returns {PropertyFormBuilder} An instance of a property form builder.
     * 
     * @example
     * const factory: PropertyFormBuilderFactory = new HomeFormFactory();
     * const formBuilder: PropertyFormBuilder = factory.createFormBuilder();
     */
    createFormBuilder(): PropertyFormBuilder;
}