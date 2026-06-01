import { WarehouseSectionsComponent, WarehouseToiletsComponent } from "@/components/stepper/step2.components";
import { PropertyFormBuilder } from "./property.form.builder";

export class WarehouseFormBuilder extends PropertyFormBuilder {
    private constructor() {
        super();
        this.formElements.push(
            {
                name: "nbrSections",
                label: "Nombre de sections",
                description: "Indiquez le nombre de sections ou baies de stockage dans l'entrepôt.",
                component: WarehouseSectionsComponent,
                step: 2
            },
            {
                name: "nbrToilets",
                label: "Nombre de toilettes",
                description: "Indiquez le nombre de toilettes disponibles dans l'entrepôt.",
                component: WarehouseToiletsComponent,
                step: 2
            },
        );
    }

    public static getInstance(): WarehouseFormBuilder {
        return new WarehouseFormBuilder();
    }
}
