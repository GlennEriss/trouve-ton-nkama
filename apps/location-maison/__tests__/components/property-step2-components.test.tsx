import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import * as Step2 from '@/components/stepper/step2.components'

const mediator: Record<string, jest.Mock> = {}
let mockRadioChange: ((value: string) => void) | undefined

jest.mock('@/hooks/useStep2FormPropertyMediator', () => ({
  useStep2FormPropertyMediator: () => mediator,
}))

jest.mock('@/components/shared/ui/InheritedFormControl', () => ({
  useInheritedFormControl: () => ({ 'aria-label': 'choix' }),
}))

jest.mock('@/components/ui/form', () => ({
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <>{children}</>,
  FormLabel: ({ children }: any) => <span>{children}</span>,
}))

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange, value, ...props }: any) => (
    <div data-value={value} {...props} ref={() => { mockRadioChange = onValueChange }}>{children}</div>
  ),
  RadioGroupItem: ({ value }: any) => (
    <button type="button" onClick={() => mockRadioChange?.(value)}>{value}</button>
  ),
}))

jest.mock('@/components/shared/ui/InputNumberApp', () => ({
  InputNumberApp: ({ value, onChange }: any) => <input aria-label="number" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />,
}))

jest.mock('@/components/shared/ui/InputApp', () => ({
  InputApp: ({ value, onChange, ...props }: any) => <input aria-label="text" value={value ?? ''} onChange={onChange} {...props} />,
}))

const numericPairs = [
  ['RoomsComponent', 'getRooms', 'setRooms'],
  ['KitchensComponent', 'getKitchens', 'setKitchens'],
  ['BathroomsComponent', 'getBathrooms', 'setBathrooms'],
  ['ToiletsComponent', 'getToilets', 'setToilets'],
  ['ApartmentFloorComponent', 'getApartmentFloor', 'setApartmentFloor'],
  ['NbrApartmentsComponent', 'getNbrApartments', 'setNbrApartments'],
  ['NbrFloorsComponent', 'getNbrFloors', 'setNbrFloors'],
  ['NbrRoomsComponent', 'getDeskRooms', 'setDeskRooms'],
  ['NbrToiletsComponent', 'getDeskToilets', 'setDeskToilets'],
  ['HomeFloorsComponent', 'getHomeFloors', 'setHomeFloors'],
  ['NbrLivingRoomsComponent', 'getLivingRooms', 'setLivingRooms'],
  ['NbrGaragesComponent', 'getGarages', 'setGarages'],
  ['ShopRoomsComponent', 'getShopRooms', 'setShopRooms'],
  ['ShopToiletsComponent', 'getShopToilets', 'setShopToilets'],
  ['StudioFloorComponent', 'getStudioFloor', 'setStudioFloor'],
  ['VillaFloorsComponent', 'getVillaFloors', 'setVillaFloors'],
  ['VillaGaragesComponent', 'getVillaGarages', 'setVillaGarages'],
  ['VillaPiscinesComponent', 'getVillaPiscines', 'setVillaPiscines'],
  ['DuplexFloorsComponent', 'getDuplexFloors', 'setDuplexFloors'],
  ['DuplexGaragesComponent', 'getDuplexGarages', 'setDuplexGarages'],
  ['DuplexLivingRoomsComponent', 'getDuplexLivingRooms', 'setDuplexLivingRooms'],
  ['WarehouseSectionsComponent', 'getWarehouseSections', 'setWarehouseSections'],
  ['WarehouseToiletsComponent', 'getWarehouseToilets', 'setWarehouseToilets'],
] as const

const textPairs = [
  ['ApartmentNumberComponent', 'getApartmentNumber', 'setApartmentNumber'],
  ['KioskTypeComponent', 'getKioskType', 'setKioskType'],
  ['RoomTypeComponent', 'getRoomType', 'setRoomType'],
] as const

describe('composants de la deuxième étape immobilière', () => {
  beforeEach(() => {
    Object.keys(mediator).forEach((key) => delete mediator[key])
  })

  it.each(numericPairs)('%s convertit la saisie en nombre', (componentName, getter, setter) => {
    mediator[getter] = jest.fn(() => 2)
    mediator[setter] = jest.fn()
    const Component = Step2[componentName]
    render(<Component />)
    fireEvent.change(screen.getByLabelText('number'), { target: { value: '7' } })
    expect(mediator[setter]).toHaveBeenCalledWith(7)
  })

  it.each(textPairs)('%s transmet la saisie textuelle', (componentName, getter, setter) => {
    mediator[getter] = jest.fn(() => 'A')
    mediator[setter] = jest.fn()
    const Component = Step2[componentName]
    render(<Component />)
    fireEvent.change(screen.getByLabelText('text'), { target: { value: 'B12' } })
    expect(mediator[setter]).toHaveBeenCalledWith('B12')
  })

  it('préserve le type des choix et accepte aussi la valeur brute', () => {
    const onChange = jest.fn()
    const { rerender } = render(<Step2.ChoiceComponent data={[{ label: 'Oui', value: true }]} value={true} onValueChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'true' }))
    expect(onChange).toHaveBeenCalledWith(true)

    rerender(<Step2.ChoiceComponent data={[]} field={{ value: undefined, onChange }} />)
    expect(screen.getByLabelText('choix')).not.toHaveAttribute('data-value')
  })

  it('convertit correctement le choix de parking', () => {
    mediator.hasParking = jest.fn(() => false)
    mediator.setHasParking = jest.fn()
    render(<Step2.HasParkingComponent />)
    fireEvent.click(screen.getByRole('button', { name: 'true' }))
    expect(mediator.setHasParking).toHaveBeenCalledWith(true)
  })

  it('initialise le numéro de studio à 01 puis conserve les changements', async () => {
    mediator.getStudioNumber = jest.fn(() => '')
    mediator.setStudioNumber = jest.fn()
    render(<Step2.StudioNumberComponent />)
    await waitFor(() => expect(mediator.setStudioNumber).toHaveBeenCalledWith('01'))
    expect(screen.getByLabelText('text')).toHaveValue('01')
    fireEvent.change(screen.getByLabelText('text'), { target: { value: '09' } })
    expect(mediator.setStudioNumber).toHaveBeenCalledWith('09')
  })

  it('reprend un numéro de studio existant', () => {
    mediator.getStudioNumber = jest.fn(() => '14')
    mediator.setStudioNumber = jest.fn()
    render(<Step2.StudioNumberComponent />)
    expect(screen.getByLabelText('text')).toHaveValue('14')
    expect(mediator.setStudioNumber).not.toHaveBeenCalled()
  })
})
