'use client'
import { WarehouseFormFactory } from "@/factories/property-form/warehouse.form.factory";
import { FormProperty } from "../stepper/FormProperty";

export default function FormWarehouse() {
    return (
        <FormProperty FactoryClass={WarehouseFormFactory} />
    )
}
