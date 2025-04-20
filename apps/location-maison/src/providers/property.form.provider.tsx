'use client'
import { Form } from "@/components/ui/form"
import { createContext, useContext, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { ApartmentSchema, BuildingSchema, DeskSchema, HomeSchema, StudioSchema, VillaSchema, KioskSchema, RoomSchema, ShopSchema } from "@/models/schema"
import { Property, TypeProperty, Image } from "@/models/annonce"
import { DirectorFactory } from "@/directors/factory.director"
import { useToast } from "@/hooks/use-toast"
import { usePathname, useRouter } from "next/navigation"
import { createFile } from "@/db/file.db"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createProperty, getPropertyById, updateProperty } from "@/db/property.db"
import useLastpath from "@/hooks/use-lastpath"
import React from "react"
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
    const id = isUpdate ? useLastpath() : null
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
            default:
                return 'Villa' as TypeProperty
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
            default:
                return VillaSchema
        }
    }
    const form = useForm<any>({
        resolver: zodResolver(getSchema()),
        defaultValues: {
            ...property,
            images: []
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
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: id ? "Propriété modifiée avec succès!" : "Propriété ajoutée avec succès!",
                variant: "success"
            })
            router.push(routes.protected.properties)
            //setActiveStep(prev => prev + 1)
        },
        onError: (error) => {
            toast({
                title: id ? "Modification d'une propriété" : "Ajout d'une propriété",
                description: error.message,
                variant: "destructive",
                duration: 20
            })
        }
    });
    //Submit
    const onSubmit = async (data: any) => {
        //Get images already uplaod:
        const imgStringList = data.images.filter((img: File | string | undefined) => typeof img === "string")
        const imgUplaods = imagesAlreadyUplaod.filter(img => imgStringList.includes(img.fileURL))
        //Create Images
        const filesUpload = data.images.filter((img: File | string | undefined) => img instanceof File);
        const promiseFiles = filesUpload.map(async (img: File) => {
            return await createFile(img, user?.uid!, 'property')
        })
        const images = await Promise.all(promiseFiles)
        //Create Property
        const propertyMutate: Property = {
            ...property,
            ...data,
            images: [...images, ...imgUplaods],
            createdBy: user?.uid
        }
        mutation.mutate(propertyMutate)
    }
    React.useEffect(() => {
        if (propertyToUpdated) {
            /* getPropertyById(id).then((fetchedProperty) => {
                // Set form values dynamically
                if (fetchedProperty) {
                    const { createdAt, updatedAt, images, ...othersData } = fetchedProperty
                    Object.entries(othersData).forEach(([key, value]) => {
                        form.setValue(key as any, value); // Populate each field with the fetched data
                    });
                    const imgList = images.map(img => img.fileURL)
                    setImagesAlreadyUplaod(images)
                    form.setValue('images', imgList)
                }
            }); */
            const { images, ...othersData } = propertyToUpdated
            Object.entries(othersData).forEach(([key, value]) => {
                form.setValue(key as any, value);
            });
            if (images) {
                const imgList = images.map(img => img.fileURL)
                setImagesAlreadyUplaod(images)
                form.setValue('images', imgList)
            }
        }
    }, [propertyToUpdated])
    return (
        <PropertyFormComponentContext.Provider value={{
            activeStep,
            setActiveStep,
            form,
            propertyPreview,
            setPropertyPreview
        }}>
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