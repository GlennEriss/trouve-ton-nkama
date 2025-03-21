/**
 * @module Builders/property
 */

import { Room } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

/**
 * Builder class to create a Room object.
 * 
 * This class extends the `PropertyBuilder` to provide a structured way to create 
 * a `Room` object using the builder pattern.
 * 
 * @class RoomBuilder
 * @extends PropertyBuilder
 */
export class RoomBuilder extends PropertyBuilder {
    /**
     * Protected constructor that initializes the `RoomBuilder` 
     * with default room property values.
     * 
     * @constructor
     * @protected
     */
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Room',
            roomType: ''
        } as Room;
    }

    /**
     * Finalizes the construction and returns the built `Room` object.
     * 
     * @returns {Room} The built `Room` object.
     */
    build(): Room {
        return this.property as Room;
    }

    /**
     * Static method to create a new instance of the `RoomBuilder`.
     * 
     * @returns {RoomBuilder} A new instance of `RoomBuilder`.
     */
    static getInstance(): RoomBuilder {
        return new RoomBuilder();
    }
}
