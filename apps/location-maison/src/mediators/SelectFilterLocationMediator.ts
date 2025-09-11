import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { Province } from "@/models/province";
import { City } from "@/models/city";
import { Street } from "@/models/street";
import { OptionType } from "@/models/OptionType";

export class SelectFilterLocationMediator {
    private form: UseFormReturn<FormFilterSchemaType>;
    private provinces: Province[];
    private cities: City[];
    private streets: Street[];

    constructor(form: UseFormReturn<FormFilterSchemaType>) {
        this.form = form;
        this.provinces = [];
        this.cities = [];
        this.streets = [];
    }

    setProvinces(provinces: Province[]) {
        this.provinces = provinces;
    }

    setCities(cities: City[]) {
        this.cities = cities;
    }

    setStreets(streets: Street[]) {
        this.streets = streets;
    }

    getProvinces() {
        return this.provinces;
    }

    getCities() {
        return this.cities;
    }

    getStreets() {
        return this.streets;
    }

    getProvinceOptions(): OptionType[] {
        return this.provinces
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map(province => ({ label: province.name, value: province.name }));
    }

    getCityOptions(): OptionType[] {
        return this.cities
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map(city => ({ label: city.name, value: city.name }));
    }

    getStreetOptions(): OptionType[] {
        return this.streets
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map(street => ({ label: street.name, value: street.name }));
    }

    getForm() {
        return this.form;
    }

    // Utiliser des arrow functions pour préserver le contexte this
    onProvinceChange = (provinceId: string) => {
        this.form.setValue("province", provinceId);
        this.form.setValue("city", "");
        this.form.setValue("street", "");
    }

    onCityChange = (cityId: string) => {
        this.form.setValue("city", cityId);
        this.form.setValue("street", "");
    }

    onStreetChange = (streetId: string) => {
        this.form.setValue("street", streetId);
    }
}
