/**
 * @module Builders/property-form
 */

import { TextComponent } from "@/components/stepper/step.shared.component";
import { PropertyFormBuilder } from "./property.form.builder";

/**
 * KioskFormBuilder class is a concrete builder class for creating a form related to kiosks.
 * It extends `PropertyFormBuilder` to add specific fields for the type of kiosk.
 * 
 * @class KioskFormBuilder
 * @extends PropertyFormBuilder
 */
export class KioskFormBuilder extends PropertyFormBuilder {
    
    /**
     * Private constructor that initializes form elements specific to kiosks for Step 2.
     * It adds the following field:
     * 
     * - `kioskType`: A text input field for specifying the type of kiosk.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "kioskType",
                label: "Type de kiosque",
                description: "Spécifiez le type de kiosque (ex: Alimentaire, Presse, Électronique).",
                component: (field: any) => <TextComponent {...field} />,
                step: 2
            }
        );
    }

    /**
     * Static method to get an instance of `KioskFormBuilder`.
     * 
     * @returns {KioskFormBuilder} A new instance of the `KioskFormBuilder`.
     * 
     * @example
     * const kioskFormBuilder = KioskFormBuilder.getInstance();
     * const formElements = kioskFormBuilder.build();
     */
    public static getInstance(): KioskFormBuilder {
        return new KioskFormBuilder();
    }
}
