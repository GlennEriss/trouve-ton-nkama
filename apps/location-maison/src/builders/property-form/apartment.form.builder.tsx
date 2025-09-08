/**
 * @module Builders/property-form
 */

import { LogementFormBuilder } from "./logement.form.builder";
import { ApartmentFloorComponent, ApartmentNumberComponent } from "@/components/stepper/step2.components";

/**
 * A concrete builder class for constructing forms related to apartments.
 * It extends the `LogementFormBuilder` to add apartment-specific form fields
 * such as the number of floors in the apartment and the apartment number.
 * 
 * @class ApartmentFormBuilder
 * @extends LogementFormBuilder
 */
export class ApartmentFormBuilder extends LogementFormBuilder {
    /**
     * Private constructor to initialize apartment-specific form elements.
     * This builder defines the following fields for Step 2:
     * 
     * - `nbrFloorApartment`: A numeric input field for the number of floors in the apartment.
     * - `numero`: A text input field for the apartment number.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrFloorApartment",
                label: "Numero d'étage",
                description: "Indiquez l'étage de l'appartement",
                component: (field: any) => <ApartmentFloorComponent />,
                step: 2
            },
            {
                name: "numeroApartment",
                label: "Numéro de l'appartement",
                description: "Entrez le numéro de l'appartement ou situez le à partir de son étage ex: 23, pour Etage 2, appart 3",
                component: (field: any) => <ApartmentNumberComponent />,
                step: 2
            },
        )
    }

    /**
     * Static factory method to create a new instance of `ApartmentFormBuilder`.
     * 
     * @returns {ApartmentFormBuilder} A new instance of `ApartmentFormBuilder`.
     * 
     * @example
     * const apartmentFormBuilder = ApartmentFormBuilder.getInstance();
     * const formElements = apartmentFormBuilder.build();
     */
    public static getInstance(): ApartmentFormBuilder {
        return new ApartmentFormBuilder();
    }
}