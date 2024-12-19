/**
 * @module Builders/property-form
 */

import { NumberComponent } from "@/components/stepper/step.shared.component";
import { PropertyFormBuilder } from "./property.form.builder";

/**
 * DeskFormBuilder class is a concrete builder class for creating a form related to office desks.
 * It extends `LogementFormBuilder` to add specific fields for the number of toilets and rooms in the office desk form.
 * 
 * @class DeskFormBuilder
 * @extends LogementFormBuilder
 */
export class DeskFormBuilder extends PropertyFormBuilder {
    
    /**
     * Private constructor that initializes form elements specific to desks for Step 2.
     * It adds the following fields:
     * 
     * - `nbrToilets`: A numeric input field for the number of toilets in the desk.
     * - `nbrRooms`: A numeric input field for the number of rooms in the desk.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrToilets",
                label: "Nombre de toilettes",
                description: "Indiquez le nombre total de toilettes disponibles dans la propriété.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            },
            {
                name: "nbrRooms",
                label: "Nombre de salles",
                description: "Indiquez le nombre total de pièces dans la propriété.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            }
        );
    }

    /**
     * Static method to get an instance of `DeskFormBuilder`.
     * 
     * @returns {DeskFormBuilder} A new instance of the `DeskFormBuilder`.
     * 
     * @example
     * const deskFormBuilder = DeskFormBuilder.getInstance();
     * const formElements = deskFormBuilder.build();
     */
    public static getInstance(): DeskFormBuilder {
        return new DeskFormBuilder();
    }
}