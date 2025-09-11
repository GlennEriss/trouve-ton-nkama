/**
 * @module Builders/property-form
 */

import { PropertyFormBuilder } from "./property.form.builder";
import { RoomTypeComponent } from "@/components/stepper/step2.components";

/**
 * RoomFormBuilder class is a concrete builder class for creating a form related to rooms.
 * It extends `PropertyFormBuilder` to add specific fields for the type of room.
 * 
 * @class RoomFormBuilder
 * @extends PropertyFormBuilder
 */
export class RoomFormBuilder extends PropertyFormBuilder {

    /**
     * Private constructor that initializes form elements specific to rooms for Step 2.
     * It adds the following field:
     * 
     * - `roomType`: A text input field for specifying the type of room.
     * 
     * @private
     * @constructor
     */
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "roomType",
                label: "Type de chambre",
                description: "Spécifiez le type de chambre (ex: Chambre américaine).",
                component: RoomTypeComponent,
                step: 2
            }
        );
    }

    /**
     * Static method to get an instance of `RoomFormBuilder`.
     * 
     * @returns {RoomFormBuilder} A new instance of the `RoomFormBuilder`.
     * 
     * @example
     * const roomFormBuilder = RoomFormBuilder.getInstance();
     * const formElements = roomFormBuilder.build();
     */
    public static getInstance(): RoomFormBuilder {
        return new RoomFormBuilder();
    }
}
