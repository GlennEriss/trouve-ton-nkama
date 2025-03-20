/**
 * @module factories/property-form
 */
import { PropertyFormBuilderFactory } from "./property.form.factory";
import { RoomFormBuilder } from "@/builders/property-form/room.form.builder";

/**
 * The `RoomFormFactory` class is responsible for creating an instance of the `RoomFormBuilder`.
 * It implements the `PropertyFormBuilderFactory` interface, following the Factory Pattern.
 * 
 * This factory generates a room-specific form builder that contains form elements for properties related to rooms, such as the number of beds and bathrooms.
 * 
 * @class RoomFormFactory
 * @implements {PropertyFormBuilderFactory}
 */
export class RoomFormFactory implements PropertyFormBuilderFactory {

    /**
     * Creates and returns an instance of the `RoomFormBuilder`.
     * 
     * @returns {RoomFormBuilder} An instance of the `RoomFormBuilder` used to build forms specific to room properties.
     * 
     * @example
     * const roomFactory = new RoomFormFactory();
     * const builder = roomFactory.createFormBuilder();
     * const formElements = builder.build();
     */
    createFormBuilder(): RoomFormBuilder {
        return RoomFormBuilder.getInstance();
    }
}
