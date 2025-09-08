// src/mediators/Step3FormPropertyMediator.ts
import { UseFormReturn } from "react-hook-form";

export interface Coordinates {
  lon: number;
  lat: number;
}

export class Step3FormPropertyMediator {
  private form: UseFormReturn<any>;

  constructor(form: UseFormReturn<any>) {
    this.form = form;
  }

  /** ===================== DISTRICT / CITY / PROVINCE ===================== */
  getDistrict = (): string => this.form.getValues("address.district") ?? "";
  setDistrict = (district: string) => this.form.setValue("address.district", district);

  getCity = (): string => this.form.getValues("address.city") ?? "";
  setCity = (city: string) => this.form.setValue("address.city", city);

  getProvince = (): string => this.form.getValues("address.province") ?? "";
  setProvince = (province: string) => this.form.setValue("address.province", province);

  /** ===================== COORDINATES ===================== */
  getCoordinates = (): Coordinates => ({
    lon: this.form.getValues("longitude") ?? 0,
    lat: this.form.getValues("latitude") ?? 0,
  });

  setCoordinates = (coords: Coordinates) => {
    this.form.setValue("longitude", coords.lon);
    this.form.setValue("latitude", coords.lat);
  };

  setStreetCoordinates = (coords: Coordinates) => {
    this.form.setValue("streetLon", coords.lon);
    this.form.setValue("streetLat", coords.lat);
  };

  setCityCoordinates = (coords: Coordinates) => {
    this.form.setValue("cityLon", coords.lon);
    this.form.setValue("cityLat", coords.lat);
  };

  setProvinceCoordinates = (coords: Coordinates) => {
    this.form.setValue("provinceLon", coords.lon);
    this.form.setValue("provinceLat", coords.lat);
  };

  /** ===================== FLAGS ===================== */
  isLocExact = (): boolean => this.form.getValues("isLocExact") ?? false;
  setIsLocExact = (val: boolean) => this.form.setValue("isLocExact", val);

  /** ===================== ADDITIONAL INFORMATION ===================== */
  getAdditionalInformation = (): string =>
    this.form.getValues("additionnalInformation") ?? "";
  setAdditionalInformation = (info: string) =>
    this.form.setValue("additionnalInformation", info);

  /** ===================== CONTACT ===================== */
  getContact = (): string => this.form.getValues("contact") ?? "";
  setContact = (contact: string) => this.form.setValue("contact", contact);

  /** ===================== HELPERS ===================== */
  resetLocation = () => {
    this.form.setValue("address.district", "");
    this.form.setValue("address.city", "");
    this.form.setValue("address.province", "");
    this.form.setValue("longitude", 0);
    this.form.setValue("latitude", 0);
    this.form.setValue("isLocExact", false);
    this.form.setValue("streetLon", null);
    this.form.setValue("streetLat", null);
    this.form.setValue("cityLon", null);
    this.form.setValue("cityLat", null);
    this.form.setValue("provinceLon", null);
    this.form.setValue("provinceLat", null);
  };
}
