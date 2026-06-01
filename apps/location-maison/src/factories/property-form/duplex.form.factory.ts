import { DuplexFormBuilder } from "@/builders/property-form/duplex.form.builder";
import { PropertyFormBuilderFactory } from "./property.form.factory";

export class DuplexFormFactory implements PropertyFormBuilderFactory {
    createFormBuilder(): DuplexFormBuilder {
        return DuplexFormBuilder.getInstance();
    }
}
