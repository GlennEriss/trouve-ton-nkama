/**
 * @module factories/property
 */

import { RoomBuilder } from "@/builders/property/room.builder";
import { PropertyFactory } from "./property.factory";

/**
 * Factory class responsible for creating an instance of RoomBuilder.
 * This factory implements the PropertyFactory interface and is used to create and return a RoomBuilder instance.
 * 
 * @class RoomFactory
 * @implements {PropertyFactory}
 */
export class RoomFactory implements PropertyFactory {
    /**
     * Creates and returns an instance of RoomBuilder.
     * This method uses the `getInstance()` static method from RoomBuilder to ensure the proper builder instance is returned.
     *
     * @returns {RoomBuilder} - A new instance of RoomBuilder.
     */
    createBuilder(): RoomBuilder {
        return RoomBuilder.getInstance();
    }
}
