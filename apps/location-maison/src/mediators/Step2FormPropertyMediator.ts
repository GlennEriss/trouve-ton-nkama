// src/mediators/Step2FormPropertyMediator.ts
import { UseFormReturn } from "react-hook-form";

export class Step2FormPropertyMediator {
    private form: UseFormReturn<any>;

    constructor(form: UseFormReturn<any>) {
        this.form = form;
    }

    /** ===================== ROOMS ===================== */
    getRooms = (): number => this.form.getValues("nbrRooms") ?? 0;
    setRooms = (rooms: number) => this.form.setValue("nbrRooms", rooms);

    /** ===================== KITCHENS ===================== */
    getKitchens = (): number => this.form.getValues("nbrChickens") ?? 0;
    setKitchens = (kitchens: number) => this.form.setValue("nbrChickens", kitchens);

    /** ===================== BATHROOMS ===================== */
    getBathrooms = (): number => this.form.getValues("nbrBathrooms") ?? 0;
    setBathrooms = (bathrooms: number) => this.form.setValue("nbrBathrooms", bathrooms);

    /** ===================== TOILETS ===================== */
    getToilets = (): number => this.form.getValues("nbrToilets") ?? 0;
    setToilets = (toilets: number) => this.form.setValue("nbrToilets", toilets);

    /** ===================== APARTMENT SPECIFIC ===================== */
    getApartmentFloor = (): number => this.form.getValues("nbrFloorApartment") ?? 0;
    setApartmentFloor = (floor: number) => this.form.setValue("nbrFloorApartment", floor);

    getApartmentNumber = (): string => this.form.getValues("numeroApartment") ?? "";
    setApartmentNumber = (numero: string) => this.form.setValue("numeroApartment", numero);

    /** ===================== BUILDING SPECIFIC ===================== */
    getNbrApartments = (): number => this.form.getValues("nbrApartments") ?? 0;
    setNbrApartments = (nbr: number) => this.form.setValue("nbrApartments", nbr);

    getNbrFloors = (): number => this.form.getValues("nbrFloors") ?? 0;
    setNbrFloors = (nbr: number) => this.form.setValue("nbrFloors", nbr);

    hasParking = (): boolean => this.form.getValues("hasParking") ?? false;
    setHasParking = (val: boolean) => this.form.setValue("hasParking", val);

    /** ===================== DESK ===================== */
    getDeskRooms = (): number => this.form.getValues("nbrRooms") ?? 0;
    setDeskRooms = (rooms: number) => this.form.setValue("nbrRooms", rooms);

    getDeskToilets = (): number => this.form.getValues("nbrToilets") ?? 0;
    setDeskToilets = (toilets: number) => this.form.setValue("nbrToilets", toilets);

    /** ===================== HOME ===================== */
    getHomeFloors = (): number => this.form.getValues("nbrFloors") ?? 0;
    setHomeFloors = (floors: number) => this.form.setValue("nbrFloors", floors);

    getLivingRooms = (): number => this.form.getValues("nbrLivingRoom") ?? 0;
    setLivingRooms = (nbr: number) => this.form.setValue("nbrLivingRoom", nbr);

    getGarages = (): number => this.form.getValues("nbrGarages") ?? 0;
    setGarages = (nbr: number) => this.form.setValue("nbrGarages", nbr);

    /** ===================== KIOSK ===================== */
    getKioskType = (): string => this.form.getValues("kioskType") ?? "";
    setKioskType = (type: string) => this.form.setValue("kioskType", type);

    /** ===================== ROOM ===================== */
    getRoomType = (): string => this.form.getValues("roomType") ?? "";
    setRoomType = (type: string) => this.form.setValue("roomType", type);

    /** ===================== SHOP ===================== */
    getShopRooms = (): number => this.form.getValues("nbrRooms") ?? 0;
    setShopRooms = (rooms: number) => this.form.setValue("nbrRooms", rooms);

    getShopToilets = (): number => this.form.getValues("nbrToilet") ?? 0;
    setShopToilets = (toilets: number) => this.form.setValue("nbrToilet", toilets);

    /** ===================== STUDIO ===================== */
    getStudioFloor = (): number => this.form.getValues("nbrFloorStudio") ?? 0;
    setStudioFloor = (floor: number) => this.form.setValue("nbrFloorStudio", floor);

    getStudioNumber = (): string => this.form.getValues("numeroStudio") ?? "";
    setStudioNumber = (numero: string) => this.form.setValue("numeroStudio", numero);

    /** ===================== VILLA ===================== */
    getVillaFloors = (): number => this.form.getValues("nbrFloors") ?? 0;
    setVillaFloors = (floors: number) => this.form.setValue("nbrFloors", floors);

    getVillaGarages = (): number => this.form.getValues("nbrGarages") ?? 0;
    setVillaGarages = (garages: number) => this.form.setValue("nbrGarages", garages);

    getVillaPiscines = (): number => this.form.getValues("nbrPiscine") ?? 0;
    setVillaPiscines = (piscines: number) => this.form.setValue("nbrPiscine", piscines);

    /** ===================== HELPERS ===================== */
    getValues = () => this.form.getValues();
    reset = () => {
        this.form.resetField("nbrRooms");
        this.form.resetField("nbrKitchens");
        this.form.resetField("nbrBathrooms");
        this.form.resetField("nbrToilets");
    };
}
