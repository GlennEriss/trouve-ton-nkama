/**
 * @module Builders/property-form
 */

import { NumberComponent, TextComponent } from "@/components/stepper/step.shared.component";
import { LogementFormBuilder } from "./logement.form.builder";

/**
 * StudioFormBuilder class is a concrete builder class used to construct forms specific to studio apartments.
 * It extends the `LogementFormBuilder` class to add additional fields specific to studios, 
 * such as the floor number and the studio number.
 * 
 * @class StudioFormBuilder
 * @extends LogementFormBuilder
 */
export class StudioFormBuilder extends LogementFormBuilder {
    
    /**
     * Private constructor that initializes form elements specific to studios for Step 2.
     * It adds the following fields:
     * 
     * - `nbrFloorStudio`: A numeric input field for the floor number of the studio.
     * - `numero`: A text input field for the studio number.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrFloorStudio",
                label: "Numero d'étage",
                description: "Indiquez le numéro d'étage où se situe le studio.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            },
            {
                name: "numeroStudio",
                label: "Numéro du studio",
                description: "Saisissez le numéro du studio ou à partir de son étage Ex: 12 pour étage 1 studio 2.",
                component: (field: any) => <TextComponent field={field} />,
                step: 2
            },
        );
    }

    /**
     * Static factory method to create a new instance of `StudioFormBuilder`.
     * 
     * @returns {StudioFormBuilder} A new instance of the `StudioFormBuilder`.
     * 
     * @example
     * const studioFormBuilder = StudioFormBuilder.getInstance();
     * const formElements = studioFormBuilder.build();
     */
    public static getInstance(): StudioFormBuilder {
        return new StudioFormBuilder();
    }
}