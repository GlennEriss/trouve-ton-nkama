/**
 * @module Builders/property-form
 */

import { BathroomsComponent, KitchensComponent, RoomsComponent, ToiletsComponent } from "@/components/stepper/step2.components";
import { PropertyFormBuilder } from "./property.form.builder";

/**
 * LogementFormBuilder Class for Property Forms.
 * 
 * This class extends the PropertyFormBuilder and adds additional form elements 
 * specific to housing (logement) properties, such as number of rooms, kitchens, bathrooms, and toilets.
 * 
 * @class LogementFormBuilder
 * @extends PropertyFormBuilder
 */
export abstract class LogementFormBuilder extends PropertyFormBuilder {
    /**
     * Constructor initializes the form elements for Step 2 (Logement-specific details).
     * The added form fields include:
     * 
     * - Nombre de chambres (Number of rooms)
     * - Nombre de cuisines (Number of kitchens)
     * - Nombre de douches (Number of bathrooms)
     * - Nombre de toilettes (Number of toilets)
     * 
     * Each field is associated with a step in the form (in this case, step 2).
     * 
     * @protected
     */
    protected constructor(){
        super();
        this.formElements.push(
            {
                name: "nbrRooms",
                label: "Nombre de chambres",
                description: "Indiquez le nombre de chambres disponibles dans la propriété.",
                component: RoomsComponent,
                step: 2
            },
            {
                name: "nbrKitchens",
                label: "Nombre de Cuisines",
                description: "Entrez le nombre de cuisines présentes dans la propriété.",
                component: KitchensComponent,
                step: 2
            },
            {
                name: "nbrBathrooms",
                label: "Nombre de douches",
                description: "Spécifiez combien de douches sont disponibles dans la propriété.",
                component: BathroomsComponent,
                step: 2
            },
            {
                name: "nbrToilets",
                label: "Nombre de toilettes",
                description: "Entrez le nombre de toilettes dans la propriété.",
                component: ToiletsComponent,
                step: 2
            },
        )
    }
}