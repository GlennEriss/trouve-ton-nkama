import { Apartment, Building, Desk, Home, Logement, Property, Studio, Villa } from '@/models/annonce'
import React from 'react'
import { IoMdBed } from 'react-icons/io'
import { MdKitchen } from 'react-icons/md'
import { IconType } from 'react-icons/lib'
import { FaBath, FaRegBuilding, FaSwimmingPool, FaToilet } from 'react-icons/fa'
import { BsBuilding } from 'react-icons/bs'
import { RiBookmarkLine } from 'react-icons/ri'

const items: Record<string, { label: string, icon: IconType }> = {
    room: {
        label: 'Salles',
        icon: RiBookmarkLine
    },
    bedroom: {
        label: 'Chambres',
        icon: IoMdBed
    },
    kitchen: {
        label: 'Cuisines',
        icon: MdKitchen
    },
    bathroom: {
        label: 'Salles de bain',
        icon: FaBath
    },
    toilet: {
        label: 'Toilettes',
        icon: FaToilet
    },
    floor: {
        label: 'Etages',
        icon: FaRegBuilding
    },
    apartment: {
        label: 'Appartements',
        icon: BsBuilding
    },
    garage: {
        label: 'Garages',
        icon: BsBuilding
    },
    pool: {
        label: 'Piscines',
        icon: FaSwimmingPool
    }
}
export default function DetailsProperty({ property }: { property: Property }) {
    const details = () => {
        switch (property.typeProperty) {
            case 'Apartment':
                return <DetailsApartment apartment={property as Apartment} />
            case 'Building':
                return <DetailsBuilding building={property as Building} />
            case 'Desk':
                return <DetailsDesk desk={property as Desk} />
            case 'Home':
                return <DetailsHome home={property as Home} />
            case 'Studio':
                return <DetailsStudio studio={property as Studio} />
            default:
                return <DetailsVilla villa={property as Villa} />
        }
    }
    return (
        <div>
            {details()}
        </div>
    )
}
const DetailsItem = ({ keyName, value }: { keyName: string, value: number }) => {
    const item = items[keyName]
    return (
        <div className="flex gap-1">
            <item.icon size={25} />
            <span>{value}</span>
            <span>{item.label}</span>
        </div>
    )
}
const logementItems = ['bedroom', 'kitchen', 'bathroom', 'toilet']
const DetailsLogement = ({ logement }: { logement: Logement }) => {
    const getDetailComponent = (keyName: string) => {
        switch (keyName) {
            case 'bedroom':
                return <DetailsItem keyName={keyName} value={logement.nbrRooms} />
            case 'kitchen':
                return <DetailsItem keyName={keyName} value={logement.nbrChickens} />
            case 'bathroom':
                return <DetailsItem keyName={keyName} value={logement.nbrBathrooms} />
            default:
                return <DetailsItem keyName={keyName} value={logement.nbrToilets} />
        }
    }
    return (
        <div className='grid grid-cols-2'>
            {
                logementItems.map((keyName, index) => (
                    <React.Fragment key={index}>
                        {getDetailComponent(keyName)}
                    </React.Fragment>
                ))
            }
        </div>
    )
}
const DetailsApartment = ({ apartment }: { apartment: Apartment }) => {
    return (
        <div>
            <DetailsLogement logement={apartment} />
        </div>
    )
}

const DetailsBuilding = ({ building }: { building: Building }) => {
    return (
        <div className='grid grid-cols-2'>
            <DetailsItem keyName='floor' value={building.nbrFloors} />
            <DetailsItem keyName='apartment' value={building.nbrApartments} />
        </div>
    )
}

const DetailsDesk = ({ desk }: { desk: Desk }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <DetailsItem keyName='toilet' value={desk.nbrToilets} />
            <DetailsItem keyName='room' value={desk.nbrRooms} />
        </div>
    )
}

const DetailsHome = ({ home }: { home: Home }) => {
    return (
        <div>
            <DetailsLogement logement={home} />
            <div className="grid grid-cols-2">
                <DetailsItem keyName='floor' value={home.nbrFloors} />
                <DetailsItem keyName='garage' value={home.nbrGarages} />
            </div>
        </div>

    )
}

export const DetailsStudio = ({studio}: {studio: Studio}) => {
    return (
        <div>
            <DetailsLogement logement={studio} />
        </div>
    )
}

export const DetailsVilla = ({villa}: {villa: Villa}) => {
    return (
        <div>
            <DetailsLogement logement={villa} />
            <div>
                <DetailsItem keyName='floor' value={villa.nbrFloors} />
                <DetailsItem keyName='pool' value={villa.nbrPiscine} />
                <DetailsItem keyName='garage' value={villa.nbrGarages} />
            </div>
        </div>
    )
}