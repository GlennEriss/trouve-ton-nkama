'use client'
import { HomeFormFactory } from "@/factories/property-form/home.form.factory";
import { FormProperty } from "../stepper/FormProperty";

export default function FormHome() {
    return (
        <FormProperty FactoryClass={HomeFormFactory} />
    )
}
