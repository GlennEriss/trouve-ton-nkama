/**
 * @module Builders/property-form
 */

import { InputNumberApp } from "@/components/shared/ui/InputNumberApp";
import { PropertyFormBuilder } from "./property.form.builder";

/**
 * ShopFormBuilder class is a concrete builder class for creating a form related to shops.
 * It extends `PropertyFormBuilder` to add specific fields for the number of rooms and toilets.
 * 
 * @class ShopFormBuilder
 * @extends PropertyFormBuilder
 */
export class ShopFormBuilder extends PropertyFormBuilder {
    
    /**
     * Private constructor that initializes form elements specific to shops for Step 2.
     * It adds the following fields:
     * 
     * - `nbrRooms`: A numeric input field for the number of rooms in the shop.
     * - `nbrToilet`: A numeric input field for the number of toilets in the shop.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrRooms",
                label: "Nombre de pièces",
                description: "Indiquez le nombre total de pièces dans le magasin.",
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            },
            {
                name: "nbrToilet",
                label: "Nombre de toilettes",
                description: "Indiquez le nombre total de toilettes disponibles dans le magasin.",
                component: (field: any) => <InputNumberApp {...field} />,
                step: 2
            }
        );
    }

    /**
     * Static method to get an instance of `ShopFormBuilder`.
     * 
     * @returns {ShopFormBuilder} A new instance of the `ShopFormBuilder`.
     * 
     * @example
     * const shopFormBuilder = ShopFormBuilder.getInstance();
     * const formElements = shopFormBuilder.build();
     */
    public static getInstance(): ShopFormBuilder {
        return new ShopFormBuilder();
    }
}
