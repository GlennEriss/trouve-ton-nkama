'use client'
import React, { createContext, useContext, useState, useEffect, useMemo } from "react"
import { Form } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { ApartmentSchema, BuildingSchema, DeskSchema, HomeSchema, StudioSchema, VillaSchema, KioskSchema, RoomSchema, ShopSchema, PropertySchema } from "@/models/schema"
import { Property, TypeProperty, Image } from "@/models/annonce"
import { DirectorFactory } from "@/directors/factory.director"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { createFile } from "@/db/file.db"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createProperty, updateProperty } from "@/db/property.db"
import useLastpath from "@/hooks/use-lastpath"
import queryKeys from "@/constantes/react-query-keys"
import { routes } from "@/constantes/routes"
import { updateOrCreateSuggestion } from "@/db/suggestion.db"

type PropertyFormComponent = {
    form: any,
    activeStep: number,
    setActiveStep: React.Dispatch<React.SetStateAction<number>>,
    propertyPreview: Property | undefined,
    setPropertyPreview: React.Dispatch<React.SetStateAction<Property | undefined>>,
}

export const PropertyFormComponentContext = createContext<PropertyFormComponent>({
    form: {},
    activeStep: 0,
    setActiveStep: () => { },
    propertyPreview: undefined,
    setPropertyPreview: () => { },
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
        return saved ? JSON.parse(saved) : null
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
    const getSchema = () => {
        switch (typeProperty) {
            case 'Apartment':
                return ApartmentSchema
            case 'Building':
                return BuildingSchema
            case 'Desk':
                return DeskSchema
            case 'Home':
                return HomeSchema
            case 'Studio':
                return StudioSchema
            case 'Shop':
                return ShopSchema
            case 'Kiosk':
                return KioskSchema
            case 'Room':
                return RoomSchema
            case 'Villa':
                return VillaSchema
            default: 
                return PropertySchema
        }
    }
    const form = useForm<any>({
        resolver: zodResolver(getSchema()),
        defaultValues: {
            ...property,
            images: [],
        },
    })
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
    //Submit
    const onSubmit = async (data: any) => {
        //Get images already uplaod:
        const imgStringList = data.images.filter((img: File | Blob | string | undefined) => typeof img === "string")
        const imgUplaods = imagesAlreadyUplaod.filter(img => imgStringList.includes(img.fileURL))

        // Create Images
        const filesUpload = data.images.filter((img: File | Blob | string | undefined) =>
            img instanceof File || img instanceof Blob
        ) as (File | Blob)[];

        const promiseFiles = filesUpload.map(async (img: File | Blob, index) => {
            const file = img instanceof File ? img : new File([img], `image_${index}.jpeg`, {
                type: img.type || 'image/jpeg',
                lastModified: Date.now(),
            });
            return await createFile(file, user?.uid, 'property');
        });
        const images = await Promise.all(promiseFiles)
        //Create Property
        const propertyMutate: Property = {
            ...property,
            ...data,
            images: [...images, ...imgUplaods],
            createdBy: user?.uid
        }
        mutation.mutate(propertyMutate)
        if (!isUpdate) {
            clearFormLocalStorage()
        }
    }
    React.useEffect(() => {
        if(user && user?.phoneNumbers.length > 0){
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
            // Charger les données du localStorage si elles existent
            const savedData = getFormFromLocalStorage()
            if (savedData) {
                Object.entries(savedData).forEach(([key, value]) => {
                    form.setValue(key as any, value);
                });
            }
        }
    }, [propertyToUpdated, user])

    // Sauvegarder dans le localStorage à chaque changement du formulaire
    useEffect(() => {
        if (!isUpdate) {
            const subscription = form.watch((value) => {
                if (value) {
                    saveFormToLocalStorage(value);
                }
            });
            return () => subscription.unsubscribe();
        }
    }, [form, isUpdate]);

    const contextValue = useMemo(() => ({
        activeStep,
        setActiveStep,
        form,
        propertyPreview,
        setPropertyPreview
    }), [activeStep, form, propertyPreview]);

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