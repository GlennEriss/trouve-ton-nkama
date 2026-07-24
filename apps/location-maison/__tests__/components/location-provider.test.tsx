import React, { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { LocationProvider, useLocation } from '@/providers/LocationProvider'

jest.mock('@/lib/logger', () => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
  return { createLogger: () => logger, __logger: logger }
})

const getLogger = () => (jest.requireMock('@/lib/logger') as any).__logger

function Consumer() {
  const location = useLocation()
  const [result, setResult] = useState('')
  return (
    <div>
      <span data-testid="address">{location.address}</span>
      <span data-testid="current">{JSON.stringify(location.currentLocation)}</span>
      <span data-testid="loading">{String(location.isLoading)}</span>
      <span data-testid="error">{location.error ?? ''}</span>
      <span data-testid="result">{result}</span>
      <button onClick={() => location.getLatitudeAndLongitudeLocation().then((value) => setResult(JSON.stringify(value))).catch((error) => setResult(error.message))}>position</button>
      <button onClick={() => location.getAllNeighborhoods('Libreville').then((value) => setResult(JSON.stringify(value)))}>quartiers</button>
      <button onClick={() => location.getAllNeighborhoodsWithOverpass('Estuaire').then((value) => setResult(JSON.stringify(value)))}>overpass</button>
      <button onClick={() => location.searchAddress('Akebe').then((value) => setResult(JSON.stringify(value)))}>recherche</button>
      <button onClick={() => location.updateLocation(0.4, 9.4)}>actualiser</button>
      <button onClick={() => location.setCurrentLocation({ city: 'Owendo' })}>choisir</button>
      <button onClick={() => location.setLocationsContext([{ city: 'Ntoum' }])}>liste</button>
    </div>
  )
}

function setGeolocation(implementation?: (success: PositionCallback, error: PositionErrorCallback) => void) {
  if (!implementation) {
    Reflect.deleteProperty(window.navigator, 'geolocation')
    return
  }
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: jest.fn(implementation) },
  })
}

const ok = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: jest.fn().mockResolvedValue(data) }) as any
const fail = (status = 500) => Promise.resolve({ ok: false, status, json: jest.fn() }) as any

describe('LocationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.fetch = jest.fn() as jest.Mock
    setGeolocation()
  })

  it('refuse useLocation hors du provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Consumer />)).toThrow('useLocation must be used within a LocationProvider')
    consoleError.mockRestore()
  })

  it('restaure une localisation encore fraîche depuis le cache', async () => {
    localStorage.setItem('userLocation', JSON.stringify({
      location: { city: 'Libreville', country: 'Gabon' },
      address: 'Akebe, Libreville',
      timestamp: Date.now() - 60_000,
    }))
    render(<LocationProvider><Consumer /></LocationProvider>)
    expect(await screen.findByText('Akebe, Libreville')).toBeVisible()
    expect(screen.getByTestId('current')).toHaveTextContent('Libreville')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('géocode la position navigateur et la conserve pendant 24 heures', async () => {
    setGeolocation((success) => success({ coords: { latitude: 0.42, longitude: 9.45 } } as GeolocationPosition))
    ;(global.fetch as jest.Mock).mockImplementation(() => ok({
      display_name: 'Atong-Abe, Libreville',
      address: {
        country: 'Gabon', state: 'Estuaire', city: 'Libreville', country_code: 'ga',
        neighbourhood: 'Atong-Abe', city_district: 'Libreville',
      },
    }))
    render(<LocationProvider><Consumer /></LocationProvider>)

    expect(await screen.findByText('Atong-Abe, Libreville')).toBeVisible()
    expect(global.fetch).toHaveBeenCalledWith('/api/geocode?lat=0.42&lng=9.45')
    expect(JSON.parse(localStorage.getItem('userLocation')!)).toEqual(expect.objectContaining({
      address: 'Atong-Abe, Libreville',
      location: expect.objectContaining({ countryCode: 'ga', neighbourhood: 'Atong-Abe' }),
    }))
  })

  it('expose la position et remonte les refus de géolocalisation', async () => {
    let shouldFail = false
    setGeolocation((success, error) => {
      if (shouldFail) error({ code: 1, message: 'refusée' } as GeolocationPositionError)
      else success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition)
    })
    render(<LocationProvider><Consumer /></LocationProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'position' }))
    expect(await screen.findByText('{"latitude":1,"longitude":2}')).toBeVisible()

    shouldFail = true
    fireEvent.click(screen.getByRole('button', { name: 'position' }))
    expect(await screen.findByText("Erreur lors de l'obtention de la position géographique")).toBeVisible()
    expect(getLogger().error).toHaveBeenCalled()
  })

  it('recherche les quartiers Nominatim, Overpass et une adresse', async () => {
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => ok([{
        display_name: 'Akebe', geojson: { coordinates: [[[0, 1], [2, 3]]] },
      }]))
      .mockImplementationOnce(() => ok({ elements: [
        { type: 'node', tags: { name: 'Glass' }, geometry: [{ lat: 1, lon: 2 }] },
        { type: 'area', tags: { name: 'ignoré' } },
        { type: 'way', tags: {}, geometry: undefined },
      ] }))
      .mockImplementationOnce(() => ok([{ display_name: 'Akebe-Poteau' }]))
    render(<LocationProvider><Consumer /></LocationProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'quartiers' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('Akebe'))
    expect(screen.getByTestId('result')).toHaveTextContent('[[0,1],[2,3]]')

    fireEvent.click(screen.getByRole('button', { name: 'overpass' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('Glass'))
    expect(screen.getByTestId('result')).toHaveTextContent('Inconnu')

    fireEvent.click(screen.getByRole('button', { name: 'recherche' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('Akebe-Poteau'))
    expect(global.fetch).toHaveBeenCalledWith('/api/geocode/search?q=Akebe')
  })

  it('retourne des listes vides et un état d erreur sur les pannes réseau', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => fail(503))
    render(<LocationProvider initialLat={0.4} initialLng={9.4}><Consumer /></LocationProvider>)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: 'quartiers' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('[]'))
    fireEvent.click(screen.getByRole('button', { name: 'overpass' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('[]'))
    fireEvent.click(screen.getByRole('button', { name: 'recherche' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('[]'))
    expect(getLogger().error).toHaveBeenCalled()
  })

  it('signale un navigateur sans géolocalisation et permet les mises à jour manuelles', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => ok({ display_name: 'Owendo Centre', address: { city: 'Owendo' } }))
    render(<LocationProvider><Consumer /></LocationProvider>)
    expect(getLogger().warn).toHaveBeenCalledWith("La géolocalisation n'est pas prise en charge")

    fireEvent.click(screen.getByRole('button', { name: 'position' }))
    expect(await screen.findByText("La géolocalisation n'est pas prise en charge")).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'actualiser' }))
    expect(await screen.findByText('Owendo Centre')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'choisir' }))
    expect(screen.getByTestId('current')).toHaveTextContent('Owendo')
  })
})
