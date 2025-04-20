import { ApartmentSchema, BuildingSchema, DeskSchema, HomeSchema, StudioSchema, ShopSchema, KioskSchema, RoomSchema, VillaSchema } from "@/models/schema";
import { TypeProperty } from "@/models/annonce";

export const getTypeProperty = (path: string): TypeProperty => {
  const type = path.split('/').pop();
  switch (type) {
    case 'apartment':
      return 'Apartment';
    case 'building':
      return 'Building';
    case 'desk':
      return 'Desk';
    case 'home':
      return 'Home';
    case 'studio':
      return 'Studio';
    case 'shop':
      return 'Shop';
    case 'kiosk':
      return 'Kiosk';
    case 'room':
      return 'Room';
    default:
      return 'Villa';
  }
};

export const getSchema = (typeProperty: TypeProperty) => {
  switch (typeProperty) {
    case 'Apartment':
      return ApartmentSchema;
    case 'Building':
      return BuildingSchema;
    case 'Desk':
      return DeskSchema;
    case 'Home':
      return HomeSchema;
    case 'Studio':
      return StudioSchema;
    case 'Shop':
      return ShopSchema;
    case 'Kiosk':
      return KioskSchema;
    case 'Room':
      return RoomSchema;
    default:
      return VillaSchema;
  }
};
