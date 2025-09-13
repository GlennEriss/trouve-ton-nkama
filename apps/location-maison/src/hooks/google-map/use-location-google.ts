import { LocationGoogleMapMediator } from "@/mediators/LocationGoogleMapMediator";
import { useCities } from "../use-cities";
import { useProvinces } from "../use-provinces";
import { useStreets } from "../use-streets";

export const useLocationGoogle = () => {
    const mediator = LocationGoogleMapMediator.getInstance();
    const { data: provinces } = useProvinces();
    const province = provinces?.find(province => province.name === mediator.getProvinceName());
    mediator.setProvinceLon(province?.longitude);
    mediator.setProvinceLat(province?.latitude);
    const { data: cities } = useCities(
        provinces?.find(province => province.name === mediator.getProvinceName())?.id
    );
    const city = cities?.find(city => city.name === mediator.getCityName());
    mediator.setCityLon(city?.longitude);
    mediator.setCityLat(city?.latitude);
    const { data: streets } = useStreets(
        cities?.find(city => city.name === mediator.getCityName())?.id
    );
    const street = streets?.find(street => street.name === mediator.getStreetName());
    mediator.setStreetLon(street?.longitude);
    mediator.setStreetLat(street?.latitude);
    return {
        mediator
    }
}
