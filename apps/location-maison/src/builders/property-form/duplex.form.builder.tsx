import { DuplexFloorsComponent, DuplexGaragesComponent, DuplexLivingRoomsComponent } from "@/components/stepper/step2.components";
import { LogementFormBuilder } from "./logement.form.builder";

export class DuplexFormBuilder extends LogementFormBuilder {
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrFloors",
                label: "Nombre d'étages",
                description: "Indiquez le nombre total d'étages dans le duplex.",
                component: DuplexFloorsComponent,
                step: 2
            },
            {
                name: "nbrLivingRoom",
                label: "Nombre de salons",
                description: "Indiquez le nombre total de salons disponibles.",
                component: DuplexLivingRoomsComponent,
                step: 2
            },
            {
                name: "nbrGarages",
                label: "Nombre de garages",
                description: "Indiquez le nombre total de garages disponibles.",
                component: DuplexGaragesComponent,
                step: 2
            },
        );
    }

    public static getInstance(): DuplexFormBuilder {
        return new DuplexFormBuilder();
    }
}
