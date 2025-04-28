import { FaBed, FaBath, FaBuilding, FaWarehouse, FaHome, FaSwimmingPool, FaStore, FaToilet, FaDoorOpen } from 'react-icons/fa';
import { Property } from '@/models/annonce'
import React from 'react'

type DetailsPropertyMobileProps = {
    property: Property
}

const iconMap: Record<string, JSX.Element> = {
    "Chambres": <FaBed size={20} className="text-blue-500" />,
    "Cuisines": <FaHome size={20} className="text-green-500" />,
    "Salles de bain": <FaBath size={20} className="text-indigo-500" />,
    "Étages": <FaBuilding size={20} className="text-yellow-500" />,
    "Garages": <FaWarehouse size={20} className="text-orange-500" />,
    "Piscine": <FaSwimmingPool size={20} className="text-cyan-500" />,
    "Nombre d'étages": <FaBuilding size={20} className="text-yellow-500" />,
    "Nombre d'appartements": <FaBuilding size={20} className="text-purple-500" />,
    "Parking": <FaWarehouse size={20} className="text-pink-500" />,
    "Bureaux": <FaHome size={20} className="text-green-500" />,
    "Toilettes": <FaToilet size={20} className="text-rose-500" />,
    "Salles": <FaDoorOpen size={20} className="text-teal-500" />,
    "Superficie (m²)": <FaBuilding size={20} className="text-lime-500" />,
    "Type de Kiosque": <FaStore size={20} className="text-violet-500" />,
    "Type de Chambre": <FaDoorOpen size={20} className="text-sky-500" />,
    "Numéro": <FaDoorOpen size={20} className="text-emerald-500" />,
};

const DetailsItemMobile = ({ label, value }: { label: string; value: string | number | boolean }) => {
    if (value === 0 || value === '' || value === null || value === undefined) {
        return null;
    }
    if (label === "Type de Kiosque" || label === "Type de Chambre") {
        return (
            <div className="flex items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                <div className="text-gray-700 text-sm">{value}</div>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all duration-150">
            <div className="flex-shrink-0">
                {iconMap[label]}
            </div>
            <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
            </div>
        </div>
    );
};

export const DetailsPropertyMobile: React.FC<DetailsPropertyMobileProps> = ({ property }) => {
    const propertyDetails: any = property;

    let items: { label: string; value: string | number | boolean | undefined }[] = [];

    switch (property.typeProperty) {
        case "Villa":
        case "Home":
            items = [
                { label: "Chambres", value: propertyDetails.nbrRooms },
                { label: "Cuisines", value: propertyDetails.nbrChickens },
                { label: "Salles de bain", value: propertyDetails.nbrBathrooms },
                { label: "Étages", value: propertyDetails.nbrFloors },
                { label: "Garages", value: propertyDetails.nbrGarages },
                ...(property.typeProperty === "Villa" ? [{ label: "Piscine", value: propertyDetails.nbrPiscine ? "Oui" : "Non" }] : []),
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Apartment":
        case "Studio":
            items = [
                { label: "Chambres", value: propertyDetails.nbrRooms },
                { label: "Cuisines", value: propertyDetails.nbrChickens },
                { label: "Salles de bain", value: propertyDetails.nbrBathrooms },
                { label: "Étage Appartement", value: propertyDetails.nbrFloorApartment || propertyDetails.nbrFloorStudio },
                { label: "Numéro", value: propertyDetails.numeroApartment || propertyDetails.numeroStudio },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Building":
            items = [
                { label: "Nombre d'étages", value: propertyDetails.nbrFloors },
                { label: "Nombre d'appartements", value: propertyDetails.nbrApartments },
                { label: "Parking", value: propertyDetails.hasParking ? "Oui" : "Non" },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Desk":
            items = [
                { label: "Bureaux", value: propertyDetails.nbrRooms },
                { label: "Toilettes", value: propertyDetails.nbrToilets },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Shop":
            items = [
                { label: "Salles", value: propertyDetails.nbrRooms },
                { label: "Toilettes", value: propertyDetails.nbrToilet },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Kiosk":
            items = [
                { label: "Type de Kiosque", value: propertyDetails.kioskType },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        case "Room":
            items = [
                { label: "Type de Chambre", value: propertyDetails.roomType },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
        default:
            items = [
                { label: "Superficie (m²)", value: propertyDetails.area },
            ].filter((item): item is { label: string; value: string | number | boolean | undefined } => Boolean(item));
            break;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item, index) => (
                <DetailsItemMobile key={index} label={item.label} value={item.value ?? '-'} />
            ))}
        </div>
    );
};