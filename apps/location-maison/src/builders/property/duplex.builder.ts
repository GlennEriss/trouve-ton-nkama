import { Duplex } from "@/models/annonce";
import { HomeBuilder } from "./home.builder";

export class DuplexBuilder extends HomeBuilder {
    private constructor() {
        super();
        this.property = {
            ...this.property,
            typeProperty: 'Duplex',
        } as Duplex;
    }

    build(): Duplex {
        return this.property as Duplex;
    }

    static getInstance(): DuplexBuilder {
        return new DuplexBuilder();
    }
}
