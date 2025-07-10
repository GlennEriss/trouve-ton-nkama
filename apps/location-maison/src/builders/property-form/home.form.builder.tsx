/**
 * @module Builders/property-form
 */

import { InputNumberApp } from "@/components/shared/ui/InputNumberApp";
import { LogementFormBuilder } from "./logement.form.builder";

/**
 * HomeFormBuilder class is a concrete builder class used to construct a form specific to houses.
 * This builder extends `LogementFormBuilder` to add additional fields specific to houses, such as 
 * the number of floors and the number of garages.
 * 
 * @class HomeFormBuilder
 * @extends LogementFormBuilder
 */
export class HomeFormBuilder extends LogementFormBuilder {

    /**
     * Private constructor that initializes form elements specific to houses for Step 2.
     * It adds the following fields:
     * 
     * - `nbrFloors`: A numeric input field for the number of floors in the house.
     * - `nbrGarages`: A numeric input field for the number of garages in the house.
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
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            },
            {
                name: "nbrLivingRoom",
                label: "Nombre de salons",
                description: "Indiquez le nombre total de salons disponibles dans la propriété.",
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            },
            {
                name: "nbrGarages",
                label: "Nombre de garages",
                description: "Indiquez le nombre total de garages disponibles dans la propriété.",
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            },
        );
    }

    /**
     * Static factory method to create a new instance of `HomeFormBuilder`.
     * 
     * @returns {HomeFormBuilder} A new instance of `HomeFormBuilder`.
     * 
     * @example
     * const homeFormBuilder = HomeFormBuilder.getInstance();
     * const formElements = homeFormBuilder.build();
     */
    public static getInstance(): HomeFormBuilder {
        return new HomeFormBuilder();
    }
}