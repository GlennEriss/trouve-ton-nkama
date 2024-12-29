'use client'
import { Form } from "@/components/ui/form"
import { createContext, useContext, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { ApartmentSchema, BuildingSchema, DeskSchema, HomeSchema, StudioSchema, VillaSchema } from "@/models/schema"
import { Property, TypeProperty } from "@/models/annonce"
import { DirectorFactory } from "@/directors/factory.director"
import { useToast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { createFile } from "@/db/file.db"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createProperty, getPropertyById } from "@/db/property.db"
import useLastpath from "@/hooks/use-lastpath"
import React from "react"
import queryKeys from "@/constantes/react-query-keys"

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

export const PropertyFormComponentProvider = ({ children }: { children: React.ReactNode }) => {
    //User
    const user = useCurrentUser()

    //pathnames
    const pathname = usePathname()
    const id = useLastpath()
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
            default:
                return 'Villa' as TypeProperty
        }
    }
    const typeProperty = getTypeProperty()

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
            const id = await createProperty(data)
            if(id){
                const propertyCreate = {...data, id}
                setPropertyPreview(propertyCreate)

            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.properties] })
            toast({
                title: "Ajout d'une propriété",
                description: "Propriété ajoutée avec succès!",
                variant: "success"
            })
            setActiveStep(prev => prev + 1)
        },
        onError: (error) => {
            toast({
                title: "Ajout d'une propriété",
                description: error.message,
                variant: "destructive",
                duration: 20
            })
        }
    });
    //Submit
    const onSubmit = async (data: any) => {
        //Create Images
        const filesUplaod = data.images.filter((img: File | undefined) => img)
        const promiseFiles = filesUplaod.map(async (img: File) => {
            return await createFile(img, user?.uid!, 'property')
        })
        const images = await Promise.all(promiseFiles)
        //Create Property
        const propertyMutate: Property = {
            ...property,
            ...data,
            images,
            createdBy: user?.uid
        }
        mutation.mutate(propertyMutate)
    }
    React.useEffect(() => {
        if (id) {
            getPropertyById(id).then((fetchedProperty) => {
                // Set form values dynamically
                if (fetchedProperty) {
                    const { createdAt, updatedAt, images, ...othersData } = fetchedProperty
                    Object.entries(othersData).forEach(([key, value]) => {
                        form.setValue(key as any, value); // Populate each field with the fetched data
                    });
                    const imgList = images.map(img => img.fileURL)
                    form.setValue('images', imgList)
                }
            });
        }
    }, [id])
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