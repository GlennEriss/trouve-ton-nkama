import { ApartmentFormFactory } from "@/factories/property-form/apartment.form.factory";
import { BuildingFormFactory } from "@/factories/property-form/building.form.factory";
import { DeskFormFactory } from "@/factories/property-form/desk.form.factory";
import { HomeFormFactory } from "@/factories/property-form/home.form.factory";
import { KioskFormFactory } from "@/factories/property-form/kiosk.form.factory";
import { RoomFormFactory } from "@/factories/property-form/room.form.factory";
import { ShopFormFactory } from "@/factories/property-form/shop.form.factory";
import { StudioFormFactory } from "@/factories/property-form/studio.form.factory";
import { VillaFormFactory } from "@/factories/property-form/villa.form.factory";
import { TypeProperty } from "@/models/annonce";

export function getFactoryClass(type: TypeProperty) {
    switch (type) {
        case 'Apartment':
            return ApartmentFormFactory
        case 'Building':
            return BuildingFormFactory
        case 'Desk':
            return DeskFormFactory
        case 'Home':
            return HomeFormFactory
        case 'Studio':
            return StudioFormFactory
        case 'Shop':
            return ShopFormFactory
        case 'Kiosk':
            return KioskFormFactory
        case 'Room':
            return RoomFormFactory
        default:
            return VillaFormFactory
    }
}