/**
 * @module Builders/property-form
 */

import MapForm from "@/components/stepper/MapForm";
import { NumberComponent, TextareaComponent, TextComponent } from "@/components/stepper/step.shared.component";
import { ImagesComponent, StatusComponent, TagsComponent } from "@/components/stepper/step1.components";
import { InputDisabledComponent } from '@/components/stepper/step3.components';

/**
 * @typedef {Object} FormElement
 * @property {string} name - The unique name of the form field.
 * @property {string} label - The label to be displayed for the form field.
 * @property {(field: any) => React.JSX.Element} component - The React component used to render the field.
 * @property {number} step - The step number this field belongs to in the form.
 */
export type FormElement = {
    name: string,
    label: string,
    description: string,
    component: (field: any) => React.JSX.Element,
    step: number
}

/**
 * Abstract class to build the property form structure.
 * This class constructs a list of form elements that correspond to various fields 
 * in the property form (e.g., images, title, description, etc.). 
 * Concrete implementations can modify or extend the form elements as needed.
 * 
 * @abstract
 * @class PropertyFormBuilder
 */
export abstract class PropertyFormBuilder {
    /**
     * @protected
     * @type {FormElement[]}
     * 
     * An array of form elements where each element represents a field in the form.
     * Fields are associated with their step number and a React component to render them.
     */
    protected formElements: FormElement[] = [];

    /**
     * Constructor initializes the form elements for Step 1.
     * These elements include fields like images, title, description, area, price, status, and tags.
     * The components for each field are imported and associated with the form fields.
     */
    protected constructor() {
        this.formElements.push(
            {
                name: "images",
                label: "Sélectionnez plusieurs images",
                description: "Ajoutez des images de bonne qualité du bien immobilier. (Max 6)",
                component: (field: any) => <ImagesComponent field={field} />,
                step: 1
            },
            {
                name: "title",
                label: "Titre",
                description: "Entrez un titre pour décrire le bien (ex: Maison familiale spacieuse).",
                component: (field: any) => <TextComponent field={field} />,
                step: 1
            },
            {
                name: "description",
                label: "Description",
                description: "Décrivez les caractéristiques principales du bien immobilier.",
                component: (field: any) => <TextareaComponent field={field} />,
                step: 1
            },
            {
                name: "area",
                label: "Superficie",
                description: "Indiquez la superficie du bien en mètres carrés.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 1
            },
            {
                name: "price",
                label: "Prix (FCFA)",
                description: "Entrez le prix du bien immobilier ou le loyer attendu.",
                component: (field: any) => <NumberComponent field={field} />,
                step: 1
            },
            {
                name: "status",
                label: "Statut",
                description: "Choisissez si le bien est à vendre ou à louer.",
                component: (field: any) => <StatusComponent field={field} />,
                step: 1
            },
            {
                name: "tags",
                label: "Tags",
                description: "Ajoutez des tags pour décrire le bien (ex: moderne, familial).",
                component: (field: any) => <TagsComponent field={field} />,
                step: 1
            },
            {
                name: "street",
                label: "Saisissez la localité de votre logement",
                description: "Saisissez puis sélectionnez un quartier",
                component: (field: any) => <MapForm />,
                step: 3
            }, 
            {
                name: "province",
                label: "Province",
                description: "",
                component: (field: any) => <InputDisabledComponent field={field} />,
                step: 3
            },
            {
                name: "city",
                label: "Ville",
                description: "",
                component: (field: any) => <InputDisabledComponent field={field} />,
                step: 3
            },
            {
                name: "street",
                label: "Quartier",
                description: "Saisissez puis sélectionnez un quartier",
                component: (field: any) => <InputDisabledComponent field={field} />,
                step: 3
            }, 
            {
                name: "additionnalInformation",
                label: "Informations complémentaires",
                description: "Ex: Terminus Awoungou en face de...",
                component: (field: any) => <TextareaComponent field={field} />,
                step: 3
            }
        )
    }
    /**
    * Method to build and return the form elements.
    * 
    * @returns {FormElement[]} - Returns the array of form elements.
    */
    public build() {
        return this.formElements
    };
}