import React from 'react'
import { render } from '@testing-library/react'

import AlgoliaFilters from '@/components/home-page/AlgoliaFilters'
import { propertyTypesList } from '@/components/home-page/PropertyTypeList'

describe('AlgoliaFilters', () => {
  it('ne rend rien (placeholder desactive)', () => {
    const { container } = render(<AlgoliaFilters />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('propertyTypesList', () => {
  it('expose les douze types de biens avec une icone chacun', () => {
    expect(propertyTypesList).toHaveLength(12)
    for (const entry of propertyTypesList) {
      expect(typeof entry.type).toBe('string')
      expect(entry.icon).toBeTruthy()
    }
    expect(propertyTypesList.map((e) => e.type)).toEqual(
      expect.arrayContaining([
        'Home', 'Studio', 'Apartment', 'Building', 'Desk', 'Room', 'Kiosk', 'Shop', 'Land',
        'Villa', 'Duplex', 'Warehouse',
      ]),
    )
  })
})
