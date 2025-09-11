export interface PhotonResult {
    properties: {
        name: string
        city?: string
        state?: string
        country: string
        district?: string
        suburb?: string
        neighbourhood?: string
        osm_key: string
        osm_value: string
        type?: string
    }
    geometry: {
        coordinates: [number, number]
    }
}