import { Warehouse } from "@/models/annonce";
import { PropertyBuilder } from "./property.builder";

export class WarehouseBuilder extends PropertyBuilder {
    protected constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Warehouse',
            nbrSections: 0,
            nbrToilets: 0,
        } as Warehouse;
    }

    build(): Warehouse {
        return this.property as Warehouse;
    }

    static getInstance(): WarehouseBuilder {
        return new WarehouseBuilder();
    }
}
