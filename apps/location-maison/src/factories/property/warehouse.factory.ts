import { WarehouseBuilder } from "@/builders/property/warehouse.builder";
import { PropertyFactory } from "./property.factory";

export class WarehouseFactory implements PropertyFactory {
    createBuilder(): WarehouseBuilder {
        return WarehouseBuilder.getInstance();
    }
}
