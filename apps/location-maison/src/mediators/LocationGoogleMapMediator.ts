export class LocationGoogleMapMediator {
    private static instance: LocationGoogleMapMediator;
    private provinceName: string;
    private cityName: string;
    private streetName: string;
    private provinceLon: number|undefined;
    private provinceLat: number|undefined;
    private cityLon: number|undefined;
    private cityLat: number|undefined;
    private streetLon: number|undefined;
    private streetLat: number|undefined;

    private constructor() {
        this.provinceName = '';
        this.cityName = '';
        this.streetName = '';
        this.provinceLon = undefined;
        this.provinceLat = undefined;
        this.cityLon = undefined;
        this.cityLat = undefined;
        this.streetLon = undefined;
        this.streetLat = undefined;
    }

    setProvinceName(provinceName: string) {
        this.provinceName = provinceName;
    }

    setCityName(cityName: string) {
        this.cityName = cityName;
    }

    setStreetName(streetName: string) {
        this.streetName = streetName;
    }

    setProvinceLon(provinceLon: number|undefined) {
        this.provinceLon = provinceLon;
    }

    setProvinceLat(provinceLat: number|undefined) {
        this.provinceLat = provinceLat;
    }

    setCityLon(cityLon: number|undefined) {
        this.cityLon = cityLon;
    }

    setCityLat(cityLat: number|undefined) {
        this.cityLat = cityLat;
    }

    setStreetLon(streetLon: number|undefined) {
        this.streetLon = streetLon;
    }

    setStreetLat(streetLat: number|undefined) {
        this.streetLat = streetLat;
    }

    getProvinceName() {
        return this.provinceName;
    }

    getCityName() {
        return this.cityName;
    }

    getStreetName() {
        return this.streetName;
    }

    getProvinceLon() {
        return this.provinceLon;
    }

    getProvinceLat() {
        return this.provinceLat;
    }

    getCityLon() {
        return this.cityLon;
    }

    getCityLat() {
        return this.cityLat;
    }

    getStreetLon() {
        return this.streetLon;
    }

    getStreetLat() {
        return this.streetLat;
    }

    static getInstance() {
        if (!LocationGoogleMapMediator.instance) {
            LocationGoogleMapMediator.instance = new LocationGoogleMapMediator();
        }
        return LocationGoogleMapMediator.instance;
    }
}