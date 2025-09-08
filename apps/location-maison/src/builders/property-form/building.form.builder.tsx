/**
 * @module Builders/property-form
 */

import { PropertyFormBuilder } from "./property.form.builder";
import { NbrApartmentsComponent, NbrFloorsComponent, HasParkingComponent } from "@/components/stepper/step2.components";
/**
 * A concrete builder class responsible for constructing forms related to buildings.
 * This builder extends `LogementFormBuilder` and adds specific fields for buildings, such as 
 * the number of apartments, floors, and availability of parking.
 * 
 * @class BuildingFormBuilder
 * @extends LogementFormBuilder
 */
export class BuildingFormBuilder extends PropertyFormBuilder {

    /**
     * Private constructor that initializes building-specific form elements for step 2.
     * The form fields include:
     * 
     * - `nbrApartments`: A numeric input field for the number of apartments in the building.
     * - `nbrFloors`: A numeric input field for the number of floors in the building.
     * - `hasParking`: A numeric input field for indicating if the building has parking.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrApartments",
                label: "Nombre d'appartements",
                description: "Indiquez le nombre total d'appartements dans ce bâtiment.",
                component: (field: any) => <NbrApartmentsComponent />,
                step: 2
            },
            {
                name: "nbrFloors",
                label: "Nombre d'étages",
                description: "Indiquez le nombre d'étages que contient le bâtiment.",
                component: (field: any) => <NbrFloorsComponent />,
                step: 2
            },
            /* {
                name: "hasParking",
                label: "Parking",
                description: "Indiquez s'il y a un parking disponible.",
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            }, */
            {
                name: "hasParking",
                label: "Parking",
                description: "L'immeuble possède t'il un parking ?",
                component: (field: any) => <HasParkingComponent />,
                step: 2
            },
        )
    }

    /**
     * Static factory method to create a new instance of `BuildingFormBuilder`.
     * 
     * @returns {BuildingFormBuilder} A new instance of `BuildingFormBuilder`.
     * 
     * @example
     * const buildingFormBuilder = BuildingFormBuilder.getInstance();
     * const formElements = buildingFormBuilder.build();
     */
    public static getInstance(): BuildingFormBuilder {
        return new BuildingFormBuilder();
    }
}