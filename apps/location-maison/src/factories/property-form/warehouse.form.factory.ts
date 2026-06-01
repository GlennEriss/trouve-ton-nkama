import { WarehouseFormBuilder } from "@/builders/property-form/warehouse.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

export class WarehouseFormFactory implements PropertyFormBuilderFactory {
    createFormBuilder(): WarehouseFormBuilder {
        return WarehouseFormBuilder.getInstance();
    }
}
