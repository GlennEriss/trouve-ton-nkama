import { DuplexBuilder } from "@/builders/property/duplex.builder";
import { PropertyFactory } from "./property.factory";

export class DuplexFactory implements PropertyFactory {
    createBuilder(): DuplexBuilder {
        return DuplexBuilder.getInstance();
    }
}
