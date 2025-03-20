import { Apartment, Building, Desk, Home, Logement, Property, Studio, Villa, Shop, Kiosk, Room } from '@/models/annonce'
import React from 'react'
import { IoMdBed } from 'react-icons/io'
import { MdKitchen } from 'react-icons/md'
import { IconType } from 'react-icons/lib'
import { FaBath, FaRegBuilding, FaSwimmingPool, FaToilet, FaStore, FaWarehouse } from 'react-icons/fa'
import { BsBuilding } from 'react-icons/bs'
import { RiBookmarkLine } from 'react-icons/ri'
import { MdStorefront } from "react-icons/md";

const items: Record<string, { label: string, icon: IconType }> = {
    room: { label: 'Salles', icon: RiBookmarkLine },
    bedroom: { label: 'Chambres', icon: IoMdBed },
    kitchen: { label: 'Cuisines', icon: MdKitchen },
    bathroom: { label: 'Salles de bain', icon: FaBath },
    toilet: { label: 'Toilettes', icon: FaToilet },
    floor: { label: 'Étages', icon: FaRegBuilding },
    apartment: { label: 'Appartements', icon: BsBuilding },
    garage: { label: 'Garages', icon: BsBuilding },
    pool: { label: 'Piscines', icon: FaSwimmingPool },
    shopType: { label: 'Type de magasin', icon: FaStore },
    kioskSize: { label: 'Taille du kiosque', icon: FaWarehouse },
    roomType: { label: 'Type de chambre', icon: IoMdBed },
    nbrBeds: { label: 'Lits', icon: IoMdBed }
};

export default function DetailsProperty({ property }: { property: Property }) {
    const details = () => {
        switch (property.typeProperty) {
            case 'Apartment': return <DetailsApartment apartment={property as Apartment} />;
            case 'Building': return <DetailsBuilding building={property as Building} />;
            case 'Desk': return <DetailsDesk desk={property as Desk} />;
            case 'Home': return <DetailsHome home={property as Home} />;
            case 'Studio': return <DetailsStudio studio={property as Studio} />;
            case 'Shop': return <DetailsShop shop={property as Shop} />;
            case 'Kiosk': return <DetailsKiosk kiosk={property as Kiosk} />;
            case 'Room': return <DetailsRoom room={property as Room} />;
            default: return <DetailsVilla villa={property as Villa} />;
        }
    }

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            {details()}
        </div>
    )
}

const DetailsItem = ({ keyName, value }: { keyName: string, value: number | string }) => {
    const item = items[keyName];
    return (
        <div className="flex items-center gap-2 my-2 bg-gray-100 p-2 rounded-md shadow-sm">
            <item.icon size={25} className="text-gray-600" />
            <span className="font-medium">{value}</span>
            <span className="text-gray-500">{item.label}</span>
        </div>
    )
}

const DetailsLogement = ({ logement }: { logement: Logement }) => {
    return (
        <div className='grid grid-cols-2 gap-4'>
            <DetailsItem keyName='bedroom' value={logement.nbrRooms} />
            <DetailsItem keyName='kitchen' value={logement.nbrChickens} />
            <DetailsItem keyName='bathroom' value={logement.nbrBathrooms} />
            <DetailsItem keyName='toilet' value={logement.nbrToilets} />
        </div>
    )
}

const DetailsApartment = ({ apartment }: { apartment: Apartment }) => (
    <DetailsLogement logement={apartment} />
);

const DetailsBuilding = ({ building }: { building: Building }) => (
    <div className='grid grid-cols-2 gap-4'>
        <DetailsItem keyName='floor' value={building.nbrFloors} />
        <DetailsItem keyName='apartment' value={building.nbrApartments} />
    </div>
);

const DetailsDesk = ({ desk }: { desk: Desk }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <DetailsItem keyName='toilet' value={desk.nbrToilets} />
        <DetailsItem keyName='room' value={desk.nbrRooms} />
    </div>
);

const DetailsHome = ({ home }: { home: Home }) => (
    <div>
        <DetailsLogement logement={home} />
        <div className="grid grid-cols-2 gap-4">
            <DetailsItem keyName='floor' value={home.nbrFloors} />
            <DetailsItem keyName='garage' value={home.nbrGarages} />
        </div>
    </div>
);

const DetailsStudio = ({ studio }: { studio: Studio }) => (
    <DetailsLogement logement={studio} />
);

const DetailsVilla = ({ villa }: { villa: Villa }) => (
    <div>
        <DetailsLogement logement={villa} />
        <div className="grid grid-cols-2 gap-4">
            <DetailsItem keyName='floor' value={villa.nbrFloors} />
            <DetailsItem keyName='pool' value={villa.nbrPiscine} />
            <DetailsItem keyName='garage' value={villa.nbrGarages} />
        </div>
    </div>
);

const DetailsShop = ({ shop }: { shop: Shop }) => (
    <div className="grid grid-cols-1 gap-4">
        <DetailsItem keyName='shopType' value={shop.shopType} />
    </div>
);

const DetailsKiosk = ({ kiosk }: { kiosk: Kiosk }) => (
    <div className="grid grid-cols-1 gap-4">
        <DetailsItem keyName='kioskSize' value={kiosk.kioskSize} />
    </div>
);

const DetailsRoom = ({ room }: { room: Room }) => (
    <div className="grid grid-cols-2 gap-4">
        <DetailsItem keyName='roomType' value={room.roomType} />
        <DetailsItem keyName='nbrBeds' value={room.nbrBeds} />
    </div>
);