'use client'
import { DuplexFormFactory } from "@/factories/property-form/duplex.form.factory";
import { FormProperty } from "../stepper/FormProperty";

export default function FormDuplex() {
    return (
        <FormProperty FactoryClass={DuplexFormFactory} />
    )
}
