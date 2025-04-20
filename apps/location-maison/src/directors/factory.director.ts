/**
 * @module directors
 */

/**
 * Factory class responsible for creating PropertyDirector instances based on the type of property.
 * Depending on the provided property type, the appropriate factory will be chosen to construct a PropertyDirector.
 */
import { TypeProperty } from "@/models/annonce";
import { ApartmentFactory } from "../factories/property/apartment.factory";
import { BuildingFactory } from "../factories/property/building.factory";
import { DeskFactory } from "../factories/property/desk.factory";
import { HomeFactory } from "../factories/property/home.factory";
import { StudioFactory } from "../factories/property/studio.factory";
import { VillaFactory } from "../factories/property/villa.factory";
import { PropertyFactory } from "../factories/property/property.factory";
import { PropertyDirector } from "@/directors/property.director";
import { KioskFactory } from "@/factories/property/kiosk.factory";
import { RoomFactory } from "@/factories/property/room.factory";
import { ShopFactory } from "@/factories/property/shop.factory";

export abstract class DirectorFactory {
    /**
     * Creates a PropertyDirector based on the provided property type.
     * This method initializes the appropriate factory depending on the type of property (Apartment, Building, Desk, etc.),
     * and then returns a new instance of PropertyDirector.
     *
     * @param {TypeProperty} typeProperty - The type of property to determine the corresponding factory.
     * @returns {PropertyDirector} - An instance of PropertyDirector initialized with the appropriate factory.
     */
    static createDirectorProperty(typeProperty: TypeProperty): PropertyDirector {
        let factory: PropertyFactory;
        switch (typeProperty) {
            case 'Apartment':
                factory = new ApartmentFactory();
                break;
            case 'Building':
                factory = new BuildingFactory();
                break;
            case 'Desk':
                factory = new DeskFactory();
                break;
            case 'Home':
                factory = new HomeFactory();
                break;
            case 'Studio':
                factory = new StudioFactory();
                break;
            case 'Room':
                factory = new RoomFactory();
                break;
            case 'Shop':
                factory = new ShopFactory();
                break;
            case 'Kiosk':
                factory = new KioskFactory();
                break;
            default:
                factory = new VillaFactory();
        }
        return new PropertyDirector(factory);
    }
}