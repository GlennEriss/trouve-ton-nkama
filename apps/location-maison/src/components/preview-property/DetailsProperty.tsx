import { Apartment, Building, Desk, Home, Logement, Property, Studio, Villa, Shop, Kiosk, Room } from '@/models/annonce'
import React from 'react'
import { IoMdBed } from 'react-icons/io'
import { MdKitchen } from 'react-icons/md'
import { IconType } from 'react-icons/lib'
import { FaBath, FaRegBuilding, FaSwimmingPool, FaToilet, FaStore, FaWarehouse, FaCouch } from 'react-icons/fa'
import { BsBuilding } from 'react-icons/bs'
import { RiBookmarkLine } from 'react-icons/ri'
import { GiHomeGarage } from 'react-icons/gi'
import { Ruler } from 'lucide-react';
import { EditableField } from '@/components/shared/EditableField'
import { EditableBooleanField } from '@/components/shared/EditableBooleanField'

const items: Record<string, { label: string, icon: IconType }> = {
    room: { label: 'Salles', icon: RiBookmarkLine },
    bedroom: { label: 'Chambres', icon: IoMdBed },
    kitchen: { label: 'Cuisines', icon: MdKitchen },
    bathroom: { label: 'Salles de bain', icon: FaBath },
    toilet: { label: 'Toilettes', icon: FaToilet },
    floor: { label: 'Étages', icon: FaRegBuilding },
    apartment: { label: 'Appartements', icon: BsBuilding },
    garage: { label: 'Garages', icon: GiHomeGarage },
    parking: { label: 'Parking', icon: GiHomeGarage },
    pool: { label: 'Piscines', icon: FaSwimmingPool },
    shopType: { label: 'Type de magasin', icon: FaStore },
    kioskSize: { label: 'Taille du kiosque', icon: FaWarehouse },
    roomType: { label: 'Type de chambre', icon: IoMdBed },
    nbrBeds: { label: 'Lits', icon: IoMdBed },
    nbrLivingRoom: { label: 'Salons', icon: FaCouch },
    area: { label: 'Superficie', icon: Ruler },
};

// Les champs édités ici (nbrRooms, hasParking, kioskType...) vivent sur les sous-types
// (Logement/Building/Kiosk/Room...), pas sur `Property` lui-même — Partial<Property> seul les
// rejetterait à la compilation. `saveField` (PreviewPropertyDraft.tsx), lui, reste typé
// Partial<Property> : structurellement compatible (plus de champs optionnels côté patch =
// toujours assignable à un type qui en attend moins), aucun changement requis côté appelant.
type PropertyFieldsPatch = Partial<Property & Logement & Building & Home & Villa & Shop & Kiosk & Room>

/** Applique un patch sur l'annonce (une seule clé à la fois ici) — voir `saveField` dans
 * PreviewPropertyDraft.tsx. Optionnel : sans lui, DetailsProperty reste 100% lecture seule
 * (page annonce publique). */
export type OnSaveField = (patch: PropertyFieldsPatch) => Promise<void>

function parseNonNegativeInt(raw: string): number {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        throw new Error('Entrez un nombre entier positif ou zéro.')
    }
    return parsed
}

function parsePositiveNumber(raw: string): number {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Entrez un nombre positif.')
    }
    return parsed
}

function parseNonEmptyText(raw: string): string {
    const trimmed = raw.trim()
    if (!trimmed) {
        throw new Error('Ce champ ne peut pas être vide.')
    }
    return trimmed
}

export default function DetailsProperty({
    property,
    onSaveField,
}: Readonly<{ property: Property; onSaveField?: OnSaveField }>) {
    const details = () => {
        // Pas de typeProperty = annonce hors immobilier (Mode, etc.) : DetailsLand
        // suppose `area` toujours défini ("undefined m²" sinon) — on affiche plutôt les
        // attributs génériques de la catégorie (mêmes données que ListingCard). Édition non
        // proposée ici : `attributes` est un schéma libre par catégorie, pas couvert par cette
        // fonctionnalité (immobilier uniquement, cf. les types ci-dessous).
        if (!property.typeProperty) {
            return <DetailsAttributes property={property} />;
        }
        switch (property.typeProperty) {
            case 'Apartment': return <DetailsApartment apartment={property as Apartment} onSaveField={onSaveField} />;
            case 'Building': return <DetailsBuilding building={property as Building} onSaveField={onSaveField} />;
            case 'Desk': return <DetailsDesk desk={property as Desk} onSaveField={onSaveField} />;
            case 'Home': return <DetailsHome home={property as Home} onSaveField={onSaveField} />;
            case 'Studio': return <DetailsStudio studio={property as Studio} onSaveField={onSaveField} />;
            case 'Shop': return <DetailsShop shop={property as Shop} onSaveField={onSaveField} />;
            case 'Kiosk': return <DetailsKiosk kiosk={property as Kiosk} onSaveField={onSaveField} />;
            case 'Room': return <DetailsRoom room={property as Room} onSaveField={onSaveField} />;
            case 'Villa': return <DetailsVilla villa={property as Villa} onSaveField={onSaveField} />;
            default: return <DetailsLand land={property} onSaveField={onSaveField} />;
        }
    }

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            {details()}
        </div>
    )
}

type NumberEditable = { onSave: (newValue: string) => Promise<void> }

const DetailsItem = ({
    keyName,
    value,
    editable,
}: Readonly<{ keyName: string, value: number | string | boolean, editable?: NumberEditable }>) => {
    const item = items[keyName];
    return (
        <div className="flex items-center gap-2 my-2 bg-gray-100 p-2 rounded-md shadow-sm">
            <item.icon size={25} className="text-gray-600" />
            {editable ? (
                <EditableField value={String(value)} type="number" onSave={editable.onSave} className="font-medium" />
            ) : (
                <span className="font-medium">{value}</span>
            )}
            <span className="text-gray-500">{item.label}</span>
        </div>
    )
}

const DetailsLogement = ({
    logement,
    onSaveField,
}: Readonly<{ logement: Logement, onSaveField?: OnSaveField }>) => {
    const kitchenCount = (logement as any).nbrKitchens ?? (logement as any).nbrChickens ?? 0;

    return (
        <div className='flex flex-wrap gap-4'>
            <DetailsItem
                keyName='bedroom'
                value={logement.nbrRooms}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrRooms: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='kitchen'
                value={kitchenCount}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrKitchens: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='bathroom'
                value={logement.nbrBathrooms}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrBathrooms: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='toilet'
                value={logement.nbrToilets}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrToilets: parseNonNegativeInt(v) }) }}
            />
        </div>
    )
}

const DetailsApartment = ({
    apartment,
    onSaveField,
}: Readonly<{ apartment: Apartment, onSaveField?: OnSaveField }>) => (
    <DetailsLogement logement={apartment} onSaveField={onSaveField} />
);

const DetailsBuilding = ({
    building,
    onSaveField,
}: Readonly<{ building: Building, onSaveField?: OnSaveField }>) => (
    <div className='flex flex-wrap gap-4'>
        <DetailsItem
            keyName='floor'
            value={building.nbrFloors}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrFloors: parseNonNegativeInt(v) }) }}
        />
        <div className="flex items-center gap-2 my-2 bg-gray-100 p-2 rounded-md shadow-sm">
            <GiHomeGarage size={25} className="text-gray-600" />
            {onSaveField ? (
                <EditableBooleanField
                    value={building.hasParking}
                    onSave={(v) => onSaveField({ hasParking: v })}
                    className="font-medium"
                />
            ) : (
                <span className="font-medium">{building.hasParking ? 'Oui' : 'Non'}</span>
            )}
            <span className="text-gray-500">{items.parking.label}</span>
        </div>
        <DetailsItem
            keyName='apartment'
            value={building.nbrApartments}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrApartments: parseNonNegativeInt(v) }) }}
        />
    </div>
);

const DetailsDesk = ({ desk, onSaveField }: Readonly<{ desk: Desk, onSaveField?: OnSaveField }>) => (
    <div className="flex flex-wrap md:grid-cols-3 lg:grid-cols-4 gap-4">
        <DetailsItem
            keyName='toilet'
            value={desk.nbrToilets}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrToilets: parseNonNegativeInt(v) }) }}
        />
        <DetailsItem
            keyName='room'
            value={desk.nbrRooms}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrRooms: parseNonNegativeInt(v) }) }}
        />
    </div>
);

const DetailsHome = ({ home, onSaveField }: Readonly<{ home: Home, onSaveField?: OnSaveField }>) => (
    <div>
        <DetailsLogement logement={home} onSaveField={onSaveField} />
        <div className="flex flex-wrap gap-4">
            <DetailsItem
                keyName='nbrLivingRoom'
                value={home.nbrLivingRoom ?? 0}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrLivingRoom: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='floor'
                value={home.nbrFloors}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrFloors: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='garage'
                value={home.nbrGarages}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrGarages: parseNonNegativeInt(v) }) }}
            />
        </div>
    </div>
);

const DetailsStudio = ({ studio, onSaveField }: Readonly<{ studio: Studio, onSaveField?: OnSaveField }>) => (
    <DetailsLogement logement={studio} onSaveField={onSaveField} />
);

const DetailsVilla = ({ villa, onSaveField }: Readonly<{ villa: Villa, onSaveField?: OnSaveField }>) => (
    <div>
        <DetailsLogement logement={villa} onSaveField={onSaveField} />
        <div className="flex flex-wrap gap-4">
            <DetailsItem
                keyName='floor'
                value={villa.nbrFloors}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrFloors: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='pool'
                value={villa.nbrPiscine}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrPiscine: parseNonNegativeInt(v) }) }}
            />
            <DetailsItem
                keyName='garage'
                value={villa.nbrGarages}
                editable={onSaveField && { onSave: (v) => onSaveField({ nbrGarages: parseNonNegativeInt(v) }) }}
            />
        </div>
    </div>
);

const DetailsShop = ({ shop, onSaveField }: Readonly<{ shop: Shop, onSaveField?: OnSaveField }>) => (
    <div className="flex flex-wrap gap-4">
        <DetailsItem
            keyName='room'
            value={shop.nbrRooms}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrRooms: parseNonNegativeInt(v) }) }}
        />
        <DetailsItem
            keyName='toilet'
            value={shop.nbrToilet}
            editable={onSaveField && { onSave: (v) => onSaveField({ nbrToilet: parseNonNegativeInt(v) }) }}
        />
    </div>
);

const DetailsKiosk = ({ kiosk, onSaveField }: Readonly<{ kiosk: Kiosk, onSaveField?: OnSaveField }>) => (
    <div className="flex items-center gap-2 text-gray-500">
        Type:{' '}
        {onSaveField ? (
            <EditableField
                value={kiosk.kioskType}
                onSave={(v) => onSaveField({ kioskType: parseNonEmptyText(v) })}
            />
        ) : (
            kiosk.kioskType
        )}
    </div>
);

const DetailsRoom = ({ room, onSaveField }: Readonly<{ room: Room, onSaveField?: OnSaveField }>) => (
    <div className="text-gray-500">
        {onSaveField ? (
            <EditableField
                value={room.roomType}
                onSave={(v) => onSaveField({ roomType: parseNonEmptyText(v) })}
            />
        ) : (
            room.roomType
        )}
    </div>
);

const DetailsLand = ({ land, onSaveField }: Readonly<{ land: Property, onSaveField?: OnSaveField }>) => (
    <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 my-2 bg-gray-100 p-2 rounded-md shadow-sm">
            <Ruler size={25} className="text-gray-600" />
            {onSaveField ? (
                <EditableField
                    value={String(land.area)}
                    type="number"
                    onSave={(v) => onSaveField({ area: parsePositiveNumber(v) })}
                    renderValue={(v) => `${v} m²`}
                    className="font-medium"
                />
            ) : (
                <span className="font-medium">{`${land.area} m²`}</span>
            )}
            <span className="text-gray-500">{items.area.label}</span>
        </div>
    </div>
);

const DetailsAttributes = ({ property }: Readonly<{ property: Property }>) => {
    const attributes = property.attributes && typeof property.attributes === 'object' ? property.attributes : {};
    const entries = Object.entries(attributes).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
    );

    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-4">
            {entries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 my-2 bg-gray-100 p-2 rounded-md shadow-sm">
                    <span className="font-medium">{String(value)}</span>
                </div>
            ))}
        </div>
    );
};
