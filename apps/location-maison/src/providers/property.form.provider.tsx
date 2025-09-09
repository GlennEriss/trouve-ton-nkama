'use client'
import React, { createContext, useContext, useState, useEffect, useMemo } from "react"
import { Form } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { Property, TypeProperty, Image } from "@/models/annonce"
import { DirectorFactory } from "@/directors/factory.director"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createProperty, updateProperty } from "@/db/property.db"
import { updateOrCreateSuggestion } from "@/db/suggestion.db"
import { useOnSubmitFormProperty } from "@/hooks/useOnSubmitFormProperty"
import { usePropertyFormSchema } from "@/hooks/usePropertyFormSchema"
import useLastpath from "@/hooks/use-lastpath"
import queryKeys from "@/constantes/react-query-keys"
import { routes } from "@/constantes/routes"

type PropertyFormComponent = {
    form: any,
    activeStep: number,
    setActiveStep: React.Dispatch<React.SetStateAction<number>>,
    propertyPreview: Property | undefined,
    setPropertyPreview: React.Dispatch<React.SetStateAction<Property | undefined>>,
    currentStepSchema: any,
}

export const PropertyFormComponentContext = createContext<PropertyFormComponent>({
    form: {},
    activeStep: 0,
    setActiveStep: () => { },
    propertyPreview: undefined,
    setPropertyPreview: () => { },
    currentStepSchema: null,
})

export const usePropertyFormComponentContext = () => {
    return useContext(PropertyFormComponentContext)
}

export const steps = [
    { label: 'First', description: 'Contact Info' },
    { label: 'Second', description: 'Date & Time' },
    { label: 'Third', description: 'Select Rooms' },
]

const STORAGE_KEY = 'property_form_draft'

const saveFormToLocalStorage = (data: any) => {
    if (typeof window !== 'undefined') {
        // On crée une copie des données sans les images
        const { images, ...dataWithoutImages } = data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithoutImages))
    }
}

const getFormFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY)
        const parsed = saved ? JSON.parse(saved) : null;
        return parsed;
    }
    return null
}

const clearFormLocalStorage = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
    }
}

export const PropertyFormComponentProvider = ({ children, isUpdate, propertyToUpdated }: {
    children: React.ReactNode,
    isUpdate?: boolean,
    propertyToUpdated?: Partial<Property>
}) => {
    //User
    const { user } = useCurrentUser()
    //Router
    const router = useRouter()
    //pathnames
    const pathname = usePathname()
    // Hook appelé toujours, puis utilisé conditionnellement
    const lastPathValue = useLastpath()
    const id = isUpdate ? lastPathValue : null
    //Images already uplaod
    const [imagesAlreadyUplaod, setImagesAlreadyUplaod] = useState<Image[]>([])
    //Type Property
    const getTypeProperty = () => {
        const pathnames = pathname.split('/')
        const type = pathnames[pathnames.length - 1]
        switch (type) {
            case 'apartment':
                return 'Apartment' as TypeProperty
            case 'building':
                return 'Building' as TypeProperty
            case 'desk':
                return 'Desk' as TypeProperty
            case 'home':
                return 'Home' as TypeProperty
            case 'studio':
                return 'Studio' as TypeProperty
            case 'shop':
                return 'Shop' as TypeProperty
            case 'kiosk':
                return 'Kiosk' as TypeProperty
            case 'room':
                return 'Room' as TypeProperty
            case 'land':
                return 'Land' as TypeProperty
            case 'villa':
                return 'Villa' as TypeProperty
            default:
                return 'Property' as TypeProperty
        }
    }
    const typeProperty = propertyToUpdated ? propertyToUpdated.typeProperty as TypeProperty : getTypeProperty()
    //Toast
    const { toast } = useToast()

    //States
    const [activeStep, setActiveStep] = useState(0)
    const [propertyPreview, setPropertyPreview] = useState<Property | undefined>(undefined)

    //Form
    const director = DirectorFactory.createDirectorProperty(typeProperty)
    const property = director.build()

    // Hook pour gérer les schémas
    const { fullSchema, currentStepSchema } = usePropertyFormSchema(activeStep, typeProperty)
    
    const form = useForm<any>({
        resolver: zodResolver(currentStepSchema), // Utiliser le schéma de l'étape actuelle
        defaultValues: {
            ...property,
            images: [],
            tags: [],
            status: 'FOR_RENT',
            longitude: 0,
            latitude: 0,
            isLocExact: false,
            provinceLon: null,
            provinceLat: null,
            cityLon: null,
            cityLat: null,
            streetLon: null,
            streetLat: null,
        },
    })

    // Mettre à jour le resolver quand l'étape change
    React.useEffect(() => {
        form.clearErrors() // Nettoyer les erreurs précédentes
    }, [activeStep, form])
    //Mutation
    const queryClient = useQueryClient()
    const mutation = useMutation({
        mutationKey: [queryKeys.properties],
        mutationFn: async (data: Property) => {
            const province = data.province
            const city = data.city
            const street = data.street
            if (id) {
                return await updateProperty(id, data)
            } else {
                const idP = await createProperty(data)
                if (idP) {
                    const propertyCreate = { ...data, idP }
                    setPropertyPreview(propertyCreate)

                }
            }
            await updateOrCreateSuggestion({ province, city, street });
            //return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.properties] })
            toast({
                duration: 5000,
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: id ? "Propriété modifiée avec succès!" : "Propriété ajoutée avec succès!",
                variant: "success"
            })
            router.push(routes.protected.properties)
            //setActiveStep(prev => prev + 1)
        },
        onError: (error) => {
            toast({
                duration: 5000,
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: error.message,
                variant: "destructive",
            })
        }
    });
    // Hook pour gérer la soumission du formulaire
    const { onSubmit: onSubmitForm } = useOnSubmitFormProperty(
        property,
        imagesAlreadyUplaod,
        isUpdate,
        clearFormLocalStorage
    )

    //Submit
    const onSubmit = async (data: any) => {
        if (activeStep === 2) {
            // Si on est au step 2 (dernière étape), valider avec le schéma complet puis soumettre
            try {
                // Valider avec le schéma complet pour la soumission finale
                fullSchema.parse(data)
                
                const propertyMutate = await onSubmitForm(data)

                // Créer la suggestion
                const { province, city, street } = propertyMutate
                await updateOrCreateSuggestion({ province, city, street })

                // Lancer la mutation
                mutation.mutate(propertyMutate)
            } catch (error) {
                toast({
                    duration: 3000,
                    title: "Validation finale échouée",
                    description: "Veuillez vérifier tous les champs avant de soumettre.",
                    variant: "destructive"
                })
            }
        } else {
            // Si on est au step 0 ou 1, valider l'étape actuelle et passer à la suivante
            const isValid = await form.trigger()
            
            if (isValid) {
                // Vérifier si c'est une propriété de type "land" et qu'on est au step 0
                if (typeProperty === 'Land' && activeStep === 0) {
                    setActiveStep(prev => prev + 2) // Sauter le step 1 pour les terrains
                } else {
                    setActiveStep(prev => prev + 1) // Navigation normale
                }
            } else {
                toast({
                    duration: 3000,
                    title: "Validation échouée",
                    description: "Veuillez remplir tous les champs obligatoires avant de continuer.",
                    variant: "destructive"
                })
            }
        }
    }
    // Sauvegarder automatiquement les changements dans localStorage
    React.useEffect(() => {
        if (!isUpdate) {
            const subscription = form.watch((data) => {
                // Filtrer les données pour ne sauvegarder que les champs valides
                const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                        acc[key] = value;
                    }
                    return acc;
                }, {} as any);

                if (Object.keys(filteredData).length > 0) {
                    saveFormToLocalStorage(filteredData);
                }
            });

            return () => subscription.unsubscribe();
        }
    }, [isUpdate]);

    React.useEffect(() => {

        if (user && user?.phoneNumbers.length > 0) {
            form.setValue('contact', user.phoneNumbers[0])
        }
        if (propertyToUpdated) {
            const { images, ...othersData } = propertyToUpdated
            Object.entries(othersData).forEach(([key, value]) => {
                form.setValue(key as any, value);
            });
            if (images) {
                const imgList = images.map(img => img.fileURL)
                setImagesAlreadyUplaod(images)
                form.setValue('images', imgList)
            }
        } else if (!isUpdate) {
            // Charger les données du localStorage si elles existent SEULEMENT au premier chargement
            const savedData = getFormFromLocalStorage()
            if (savedData) {
                // Ne pas écraser les valeurs actuelles si elles sont différentes de 0
                Object.entries(savedData).forEach(([key, value]) => {
                    const currentValue = form.getValues(key as any);
                    // Si la valeur actuelle est différente de 0 et que la valeur sauvegardée est 0, ne pas l'écraser
                    if ((key === 'price' || key === 'area') && currentValue !== 0 && value === 0) {
                        return;
                    }
                    form.setValue(key as any, value);
                });
            }
        }
    }, [propertyToUpdated, user])

    const contextValue = useMemo(() => ({
        activeStep,
        setActiveStep,
        form,
        propertyPreview,
        setPropertyPreview,
        currentStepSchema
    }), [activeStep, form, propertyPreview, currentStepSchema]);

    return (
        <PropertyFormComponentContext.Provider value={contextValue}>
            <Form {...form}>
                <form
                    className='flex flex-col'
                    onSubmit={form.handleSubmit(onSubmit)}>
                    {children}
                </form>
            </Form>
        </PropertyFormComponentContext.Provider>
    )
}