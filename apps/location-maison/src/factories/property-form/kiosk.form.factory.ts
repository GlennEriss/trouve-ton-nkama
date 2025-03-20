

/**
 * @module factories/property-form
 */
import { KioskFormBuilder } from "@/builders/property-form/kiosk.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

/**
 * The `KioskFormFactory` class is responsible for creating an instance of the `KioskFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a kiosk-specific form builder that contains form elements for properties related to kiosks.
 * 
 * @class KioskFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class KioskFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `KioskFormBuilder`.
     * 
     * @returns {KioskFormBuilder} An instance of the `KioskFormBuilder` used to build forms specific to kiosk properties.
     * 
     * @example
     * const kioskFactory = new KioskFormFactory();
     * const builder = kioskFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): KioskFormBuilder {
        return KioskFormBuilder.getInstance();
    }
}