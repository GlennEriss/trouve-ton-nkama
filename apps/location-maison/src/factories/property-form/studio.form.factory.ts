/**
 * @module factories/property-form
 */
import { StudioFormBuilder } from "@/builders/property-form/studio.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

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
export class StudioFormFactory implements PropertyFormBuilderFactory {
    /**
     * Creates and returns an instance of StudioFormBuilder.
     * 
     * @returns {StudioFormBuilder} An instance of StudioFormBuilder used to build
     * form elements for studio-related property forms.
     */
    createFormBuilder(): StudioFormBuilder {
        return StudioFormBuilder.getInstance();
    }
}