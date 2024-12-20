/**
 * @module Builders/property-form
 */

import { NumberComponent } from "@/components/stepper/step.shared.component";
import { LogementFormBuilder } from "./logement.form.builder";

/**
 * VillaFormBuilder class is a concrete builder class for constructing a form specific to villas.
 * It extends the `LogementFormBuilder` class to add additional fields specific to villas,
 * such as the number of floors, garages, and swimming pools.
 * 
 * @class VillaFormBuilder
 * @extends LogementFormBuilder
 */
export class VillaFormBuilder extends LogementFormBuilder {

    /**
     * Private constructor that initializes form elements specific to villas for Step 2.
     * It adds the following fields:
     * 
     * - `nbrFloors`: A numeric input field for the number of floors in the villa.
     * - `nbrGarages`: A numeric input field for the number of garages in the villa.
     * - `nbrPiscine`: A numeric input field for the number of swimming pools in the villa.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrFloors",
                label: "Nombre d'étages",
                description: "Indiquez le nombre total d'étages dans la propriété.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            },
            {
                name: "nbrGarages",
                label: "Nombre de garages",
                description: "Entrez le nombre de garages disponibles sur la propriété.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            },
            {
                name: "nbrPiscine",
                label: "Nombre de piscine",
                description: "Spécifiez le nombre de piscines présentes dans la propriété.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 2
            },
        );
    }

    /**
     * Static factory method to create a new instance of `VillaFormBuilder`.
     * 
     * @returns {VillaFormBuilder} A new instance of the `VillaFormBuilder`.
     * 
     * @example
     * const villaFormBuilder = VillaFormBuilder.getInstance();
     * const formElements = villaFormBuilder.build();
     */
    public static getInstance(): VillaFormBuilder {
        return new VillaFormBuilder();
    }
}