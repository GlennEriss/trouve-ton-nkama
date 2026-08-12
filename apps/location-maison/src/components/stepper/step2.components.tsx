import React from 'react'
import { RadioGroup, RadioGroupItem } from '@trouve-ton-nkama/ui/radio-group'
import { FormItem, FormControl, FormLabel } from '@/components/ui/form'
import { InputNumberApp } from '../shared/ui/InputNumberApp'
import { useStep2FormPropertyMediator } from '@/hooks/useStep2FormPropertyMediator'
import { InputApp } from '../shared/ui/InputApp'
import { useInheritedFormControl } from '../shared/ui/InheritedFormControl'

type ChoiceComponentProps = {
    field?: any,
    data: { value: any, label: string }[]
    onValueChange?: (value: any) => void
    value?: any
}
export const ChoiceComponent: React.FC<ChoiceComponentProps> = ({ field, data, onValueChange, value }) => {
    const inheritedFormControl = useInheritedFormControl()
    const selectedValue = value !== undefined ? value : field?.value
    const handleValueChange = (rawValue: string) => {
        const selectedItem = data.find((item) => String(item.value) === rawValue)
        const nextValue = selectedItem?.value ?? rawValue
        ;(onValueChange || field?.onChange)?.(nextValue)
    }

    return (
        <RadioGroup
            {...inheritedFormControl}
            onValueChange={handleValueChange}
            value={selectedValue === undefined ? undefined : String(selectedValue)}
            className="flex gap-5"
        >
            {
                data.map((item) =>
                    <FormItem key={item.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value={String(item.value)} />
                        </FormControl>
                        <FormLabel className="font-normal">
                            {item.label}
                        </FormLabel>
                    </FormItem>
                )
            }
        </RadioGroup>
    )
}

export const RoomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getRooms()} onChange={(value) => mediator.setRooms(Number(value))} />
    )
}

export const KitchensComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    //const { watch } = useFormContext()
    //const kitchens = watch("nbrKitchens")
    return (
        <InputNumberApp value={mediator.getKitchens()} onChange={(value) => mediator.setKitchens(Number(value))} />
    )
}

export const BathroomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getBathrooms()} onChange={(value) => mediator.setBathrooms(Number(value))} />
    )
}

export const ToiletsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getToilets()} onChange={(value) => mediator.setToilets(Number(value))} />
    )
}

export const ApartmentFloorComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getApartmentFloor()} onChange={(value) => mediator.setApartmentFloor(Number(value))} />
    )
}

export const ApartmentNumberComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputApp value={mediator.getApartmentNumber()} onChange={(e) => mediator.setApartmentNumber(e.target.value)} />
    )
}

export const NbrApartmentsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getNbrApartments()} onChange={(value) => mediator.setNbrApartments(Number(value))} />
    )
}

export const NbrFloorsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getNbrFloors()} onChange={(value) => mediator.setNbrFloors(Number(value))} />
    )
}

export const HasParkingComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <ChoiceComponent
            onValueChange={(value) => mediator.setHasParking(value === true)}
            value={mediator.hasParking()}
            data={[{ label: 'Oui', value: true }, { label: 'Non', value: false }]}
        />
    )
}

export const NbrRoomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getDeskRooms()} onChange={(value) => mediator.setDeskRooms(Number(value))} />
    )
}

export const NbrToiletsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getDeskToilets()} onChange={(value) => mediator.setDeskToilets(Number(value))} />
    )
}

export const HomeFloorsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getHomeFloors()} onChange={(value) => mediator.setHomeFloors(Number(value))} />
    )
}

export const NbrLivingRoomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getLivingRooms()} onChange={(value) => mediator.setLivingRooms(Number(value))} />
    )
}       

export const NbrGaragesComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getGarages()} onChange={(value) => mediator.setGarages(Number(value))} />
    )
}

export const KioskTypeComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputApp value={mediator.getKioskType()} onChange={(e) => mediator.setKioskType(e.target.value)} />
    )
}

export const RoomTypeComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputApp value={mediator.getRoomType()} onChange={(e) => mediator.setRoomType(e.target.value)} />
    )
}

export const ShopRoomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getShopRooms()} onChange={(value) => mediator.setShopRooms(Number(value))} />
    )
}

export const ShopToiletsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getShopToilets()} onChange={(value) => mediator.setShopToilets(Number(value))} />
    )
}

export const StudioFloorComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getStudioFloor()} onChange={(value) => mediator.setStudioFloor(Number(value))} />
    )
}

export const StudioNumberComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    const [studioNumber, setStudioNumber] = React.useState(() => mediator.getStudioNumber() || '01')

    React.useEffect(() => {
        const currentStudioNumber = mediator.getStudioNumber()

        if (!currentStudioNumber) {
            mediator.setStudioNumber('01')
            setStudioNumber('01')
            return
        }

        setStudioNumber(currentStudioNumber)
    }, [mediator])

    return (
        <InputApp
            type='text'
            value={studioNumber}
            onChange={(e) => {
                setStudioNumber(e.target.value)
                mediator.setStudioNumber(e.target.value)
            }}
        />
    )
}

export const VillaFloorsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getVillaFloors()} onChange={(value) => mediator.setVillaFloors(Number(value))} />
    )
}

export const VillaGaragesComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getVillaGarages()} onChange={(value) => mediator.setVillaGarages(Number(value))} />
    )
}

export const VillaPiscinesComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getVillaPiscines()} onChange={(value) => mediator.setVillaPiscines(Number(value))} />
    )
}

export const DuplexFloorsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getDuplexFloors()} onChange={(value) => mediator.setDuplexFloors(Number(value))} />
    )
}

export const DuplexGaragesComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getDuplexGarages()} onChange={(value) => mediator.setDuplexGarages(Number(value))} />
    )
}

export const DuplexLivingRoomsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getDuplexLivingRooms()} onChange={(value) => mediator.setDuplexLivingRooms(Number(value))} />
    )
}

export const WarehouseSectionsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getWarehouseSections()} onChange={(value) => mediator.setWarehouseSections(Number(value))} />
    )
}

export const WarehouseToiletsComponent = () => {
    const mediator = useStep2FormPropertyMediator()
    return (
        <InputNumberApp value={mediator.getWarehouseToilets()} onChange={(value) => mediator.setWarehouseToilets(Number(value))} />
    )
}
