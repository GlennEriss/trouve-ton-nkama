/**
 * @module Builders/property-form
 */

import { AreaComponent, DescriptionComponent, ImagesComponent, IsOwnerComponent, PriceComponent, StatusComponent, TagsComponent, TitleComponent } from "@/components/stepper/step1.components";
import { LocationPicker } from '@/components/location';
import { MAX_IMAGES_UPLOAD, MAX_TAGS } from "@/constantes";
import { UseFormReturn } from 'react-hook-form';
import { AdditionalInformationComponent, ContactComponent, WhatsappContactComponent, CallContactComponent, AdditionalContactsComponent } from "@/components/stepper/step3.components";

/**
 * @typedef {Object} FormElement
 * @property {string} name - The unique name of the form field.
 * @property {string} label - The label to be displayed for the form field.
 * @property {(field: any, form?: UseFormReturn<any>) => React.JSX.Element} component - The React component used to render the field.
 * @property {number} step - The step number this field belongs to in the form.
 */
export type FormElement = {
    name: string,
    label: string,
    description: string,
    component: (field: any, form?: UseFormReturn<any>) => React.JSX.Element,
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
                description: `Ajoutez des images de bonne qualité du bien immobilier. (Max ${MAX_IMAGES_UPLOAD})`,
                component: ImagesComponent,
                step: 1
            },
            {
                name: "title",
                label: "Titre",
                description: "Entrez un titre pour décrire le bien (ex: Maison familiale spacieuse).",
                component: TitleComponent,
                step: 1
            },
            {
                name: "description",
                label: "Description",
                description: "Décrivez les caractéristiques principales du bien immobilier.",
                component: DescriptionComponent,
                step: 1
            },
            {
                name: "area",
                label: "Superficie",
                description: "Indiquez la superficie du bien en mètres carrés.",
                component: AreaComponent,
                step: 1
            },
            {
                name: "price",
                label: "Prix (FCFA)",
                description: "Entrez le prix du bien immobilier ou le loyer attendu.",
                component: PriceComponent,
                step: 1
            },
            {
                name: "status",
                label: "Statut",
                description: "Choisissez si le bien est à vendre ou à louer.",
                component: StatusComponent,
                step: 1
            },
            {
                name: "isOwner",
                label: "Votre rôle sur ce bien",
                description: "Indiquez si vous êtes le propriétaire direct ou un mandataire.",
                component: IsOwnerComponent,
                step: 1
            },
            {
                name: "tags",
                label: "Tags",
                description: `Ajoutez des tags pour décrire le bien (ex: moderne, familial). (Max ${MAX_TAGS})`,
                component: TagsComponent,
                step: 1
            },
            {
                name: "location",
                label: "Localisation du bien",
                description: "Recherchez votre quartier et visualisez la localisation sur la carte",
                component: LocationPicker,
                step: 3
            },
            {
                name: "additionnalInformation",
                label: "Informations complémentaires",
                description: "Ex: Terminus Awoungou en face de...",
                component: AdditionalInformationComponent,
                step: 3
            },
            {
                name: "contact",
                label: "Numéro de téléphone",
                description: "Ex: +241 06 97 00 00 00",
                component: ContactComponent,
                step: 3
            },
            {
                name: "whatsappContact",
                label: "Numéro WhatsApp (si différent)",
                description: "Laissez vide pour utiliser le numéro principal ci-dessus.",
                component: WhatsappContactComponent,
                step: 3
            },
            {
                name: "callContact",
                label: "Numéro d'appel (si différent)",
                description: "Laissez vide pour utiliser le numéro principal ci-dessus.",
                component: CallContactComponent,
                step: 3
            },
            {
                name: "additionalContacts",
                label: "Autres numéros à contacter",
                description: "Propriétaire, agent, famille... chaque numéro aura ses propres boutons WhatsApp/Appel (5 maximum).",
                component: AdditionalContactsComponent,
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