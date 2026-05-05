'use client'
import React, { createContext, useContext, useState, useMemo, useEffect } from "react"
import { Form } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { Property, Image } from "@/models/annonce"
import { DirectorFactory } from "@/directors/factory.director"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createProperty, updateProperty } from "@/db/property.db"
import { updateOrCreateSuggestion } from "@/db/suggestion.db"
import { useOnSubmitFormProperty } from "@/hooks/useOnSubmitFormProperty"
import { usePropertyFormSchema } from "@/hooks/usePropertyFormSchema"
import { useFormPropertyType } from "@/hooks/useFormPropertyType"
import { usePropertyFormStorage } from "@/hooks/usePropertyFormStorage"
import useLastpath from "@/hooks/use-lastpath"
import queryKeys from "@/constantes/react-query-keys"
import { routes } from "@/constantes/routes"
import { invalidatePropertyCountCache } from "@/lib/invalidate-property-count-cache"
import { createLogger } from "@/lib/logger"

type PropertyFormComponent = {
    form: any,
    activeStep: number,
    setActiveStep: React.Dispatch<React.SetStateAction<number>>,
    propertyPreview: Property | undefined,
    setPropertyPreview: React.Dispatch<React.SetStateAction<Property | undefined>>,
    currentStepSchema: any,
    typeProperty: string,
}

export const PropertyFormComponentContext = createContext<PropertyFormComponent>({
    form: {},
    activeStep: 0,
    setActiveStep: () => { },
    propertyPreview: undefined,
    setPropertyPreview: () => { },
    currentStepSchema: null,
    typeProperty: '',
})

export const usePropertyFormComponentContext = () => {
    return useContext(PropertyFormComponentContext)
}

export const steps = [
    { label: 'First', description: 'Contact Info' },
    { label: 'Second', description: 'Date & Time' },
    { label: 'Third', description: 'Select Rooms' },
]

const logger = createLogger('providers.property-form')
const FINAL_SUBMIT_TIMEOUT_MS = 45_000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`${operation} a pris trop de temps. Réessayez.`))
        }, timeoutMs)

        promise
            .then((value) => {
                clearTimeout(timeoutId)
                resolve(value)
            })
            .catch((error) => {
                clearTimeout(timeoutId)
                reject(error)
            })
    })
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message
    }
    return fallback
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
    // Hook appelé toujours, puis utilisé conditionnellement
    const lastPathValue = useLastpath()
    const id = isUpdate ? lastPathValue : null
    // Hook pour gérer le type de propriété
    const { typeProperty } = useFormPropertyType(propertyToUpdated)
    
    //Images already uplaod - initialiser avec les images de la propriété à mettre à jour
    const [imagesAlreadyUplaod, setImagesAlreadyUplaod] = useState<Image[]>(
        propertyToUpdated?.images || []
    )
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
    
    // Normaliser les champs de localisation pouvant être null lors d'une modification
    // Utiliser longitude/latitude comme fallback pour les anciennes propriétés
    const sanitizeLocationFields = (data: any) => ({
        provinceLon: data?.provinceLon ?? 0,
        provinceLat: data?.provinceLat ?? 0,
        cityLon: data?.cityLon ?? 0,
        cityLat: data?.cityLat ?? 0,
        // Utiliser longitude/latitude comme fallback si streetLon/streetLat ne sont pas disponibles
        streetLon: data?.streetLon ?? data?.longitude ?? 0,
        streetLat: data?.streetLat ?? data?.latitude ?? 0,
    })

    // Calculer les valeurs par défaut en fonction des props
    const getDefaultValues = () => {
        const baseValues = {
            ...property,
            images: [],
            tags: [],
            status: 'FOR_RENT',
            longitude: 0,
            latitude: 0,
            isLocExact: false,
            provinceLon: 0,
            provinceLat: 0,
            cityLon: 0,
            cityLat: 0,
            streetLon: 0,
            streetLat: 0,
            // Définir le contact directement dans les defaultValues
            contact: user?.phoneNumbers?.[0] || '',
        }

        // Si on met à jour une propriété existante, utiliser ses valeurs
        if (propertyToUpdated) {
            const { images, ...othersData } = propertyToUpdated
            return {
                ...baseValues,
                ...othersData,
                // Écraser d'éventuels null par 0 pour éviter les erreurs de validation
                ...sanitizeLocationFields(othersData as any),
                images: images ? images.map(img => img.fileURL) : [],
            }
        }

        return baseValues
    }

    const form = useForm<any>({
        resolver: zodResolver(currentStepSchema), // Utiliser le schéma de l'étape actuelle
        defaultValues: getDefaultValues(),
        shouldUnregister: false, // Conserver les valeurs des champs démontés (steps précédents)
    })

    // Hook pour gérer le localStorage
    const { clearFormLocalStorage, loadFormFromStorage } = usePropertyFormStorage(form, isUpdate, typeProperty)

    // Charger les données du localStorage après l'initialisation du formulaire
    React.useEffect(() => {
        if (!isUpdate) {
            // Attendre que le formulaire soit complètement initialisé
            const timer = setTimeout(() => {
                loadFormFromStorage()
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [loadFormFromStorage, isUpdate])

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
                const updated = await updateProperty(id, data)
                if (!updated) {
                    throw new Error("Impossible de modifier la propriété.")
                }
                return updated
            } else {
                const idP = await createProperty(data)
                if (!idP) {
                    throw new Error("Impossible d'enregistrer la propriété.")
                }
                const propertyCreate = { ...data, id: idP }
                setPropertyPreview(propertyCreate as Property)
            }
            try {
                await withTimeout(
                    updateOrCreateSuggestion({ province, city, street }),
                    8_000,
                    'Mise à jour des suggestions'
                )
            } catch (error) {
                logger.warn('Suggestion update skipped after timeout/failure', {
                    error,
                    province,
                    city,
                    street,
                })
            }
            //return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.properties] })
            void invalidatePropertyCountCache()
            toast({
                duration: 5000,
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: id ? "Propriété modifiée avec succès!" : "Propriété ajoutée avec succès!",
                variant: "success"
            })
            const destination =
                id
                    ? routes.protected.properties
                    : `${routes.protected.properties}?submitted=1`
            router.push(destination)
            //setActiveStep(prev => prev + 1)
        },
        onError: (error) => {
            toast({
                duration: 5000,
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: getErrorMessage(error, "Une erreur est survenue pendant l'enregistrement."),
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
            // Récupérer toutes les valeurs (y compris celles des steps démontés)
            const allValues = form.getValues()
            // Valider avec le schéma complet (applique aussi les transforms) puis soumettre
            try {
                const parsed = fullSchema.parse(allValues)
                logger.info('Property final submit started', {
                    activeStep,
                    typeProperty,
                    isUpdate: Boolean(id),
                    imagesCount: Array.isArray(parsed.images) ? parsed.images.length : 0,
                })

                const propertyMutate = await withTimeout(
                    onSubmitForm(parsed),
                    FINAL_SUBMIT_TIMEOUT_MS,
                    'Préparation de la propriété'
                )

                // Nettoyer les champs undefined (Firestore ne supporte pas undefined)
                const sanitize = (obj: any): any => {
                    if (Array.isArray(obj)) return obj.map(sanitize)
                    if (obj && typeof obj === 'object') {
                        return Object.fromEntries(
                            Object.entries(obj)
                                .filter(([, v]) => v !== undefined)
                                .map(([k, v]) => [k, sanitize(v)])
                        )
                    }
                    return obj
                }

                const sanitized = sanitize(propertyMutate)

                // Lancer la mutation
                await withTimeout(
                    mutation.mutateAsync(sanitized),
                    FINAL_SUBMIT_TIMEOUT_MS,
                    "Enregistrement de la propriété"
                )
                logger.info('Property final submit completed', {
                    typeProperty,
                    isUpdate: Boolean(id),
                })
        } catch (error) {
                logger.error('Property final submit failed', {
                    error,
                    activeStep,
                    typeProperty,
                    isUpdate: Boolean(id),
                })
                toast({
                    duration: 3000,
                    title: "Validation finale échouée",
                    description: getErrorMessage(
                        error,
                        "Veuillez vérifier tous les champs avant de soumettre."
                    ),
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

    // Gestionnaire d'erreurs de validation pour la soumission
    const onInvalid = (errors: any) => {
        //console.log('errors', errors)
        toast({
            duration: 3000,
            title: "Validation finale échouée",
            description: "Corrigez les erreurs du formulaire avant de soumettre.",
            variant: "destructive"
        })
    }

    // Scroll vers le haut lors du changement d'étape
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [activeStep])

    const contextValue = useMemo(() => ({
        activeStep,
        setActiveStep,
        form,
        propertyPreview,
        setPropertyPreview,
        currentStepSchema,
        typeProperty
    }), [activeStep, form, propertyPreview, currentStepSchema, typeProperty]);

    return (
        <PropertyFormComponentContext.Provider value={contextValue}>
            <Form {...form}>
                <form
                    className='flex flex-col'
                    onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
                    {children}
                </form>
            </Form>
        </PropertyFormComponentContext.Provider>
    )
}
