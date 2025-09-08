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
import { createProvince } from "@/db/province.db"
import { createCity } from "@/db/city.db"
import { createStreet } from "@/db/street.db"
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
        const { provinceLon, provinceLat, cityLon, cityLat, streetLon, streetLat, ...othersData } = data
        
        // Retirer longitude et latitude si leurs valeurs sont à 0
        let finalData = { ...othersData }
        if(data.longitude === 0 && data.latitude === 0){
           const { longitude, latitude, ...dataWithoutCoords } = finalData
           finalData = dataWithoutCoords
        }
        
        // S'assurer que isLocExact est présent (par défaut false si non défini)
        if (finalData.isLocExact === undefined) {
          finalData.isLocExact = false
        }
        
        const propertyMutate: Property = {
            ...property,
            ...finalData,
            images: [...images, ...imgUplaods],
            createdBy: user?.uid
        }
        //create province
        let provinceId: string | null = null;
        try {
            provinceId = await createProvince({
                name: propertyMutate.province,
                country: propertyMutate.country,
                countryCode: propertyMutate.countryCode,
                longitude: provinceLon,
                latitude: provinceLat
            });
        } catch (error) {
            console.error("Failed to create province:", error);
        }
        
        //create city
        let cityId: string | null = null;
        try {
            cityId = await createCity({
                name: propertyMutate.city,
                provinceId: provinceId || null,
                provinceName: propertyMutate.province,
                country: propertyMutate.country,
                countryCode: propertyMutate.countryCode,
                longitude: cityLon,
                latitude: cityLat
            });
        } catch (error) {
            console.error("Failed to create city:", error);
        }
        
        //create street
        let streetId: string | null = null;
        try {
            streetId = await createStreet({
                name: propertyMutate.street,
                cityId: cityId || null,
                cityName: propertyMutate.city,
                provinceId: provinceId || null,
                provinceName: propertyMutate.province,
                country: propertyMutate.country,
                countryCode: propertyMutate.countryCode,
                longitude: streetLon,
                latitude: streetLat
            });
        } catch (error) {
            console.error("Failed to create street:", error);
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