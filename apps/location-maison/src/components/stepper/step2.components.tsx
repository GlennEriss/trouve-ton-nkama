import React from 'react'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { FormItem, FormControl, FormLabel } from '../ui/form'
import { InputNumberApp } from '../shared/ui/InputNumberApp'
import { useStep2FormPropertyMediator } from '@/hooks/useStep2FormPropertyMediator'
import { InputApp } from '../shared/ui/InputApp'
import { useFormContext } from 'react-hook-form'

type ChoiceComponentProps = {
    field?: any,
    data: { value: any, label: string }[]
    onValueChange?: (value: any) => void
    value?: any
}
export const ChoiceComponent: React.FC<ChoiceComponentProps> = ({ field, data, onValueChange, value }) => {
    return (
        <RadioGroup
            onValueChange={onValueChange || field?.onChange}
            value={value !== undefined ? value : field?.value}
            className="flex gap-5"
        >
            {
                data.map((item) =>
                    <FormItem key={item.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value={item.value} />
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
    //const kitchens = watch("nbrChickens")
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
            onValueChange={(value) => mediator.setHasParking(Boolean(value))}
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
    return (
        <InputApp type='text' value={mediator.getStudioNumber()} onChange={(e) => mediator.setStudioNumber(e.target.value)} />
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