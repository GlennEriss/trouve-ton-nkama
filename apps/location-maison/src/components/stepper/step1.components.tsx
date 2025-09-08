/**
 * Step 1 Components for the Property Form.
 * 
 * These components handle the image upload functionality and basic property information
 * for Step 1 of the form. This includes grid layouts for images, title, description, area,
 * status, and tags.
 * 
 * Components in this section:
 * 
 * - **ImagesComponent**: Manages the grid of images for the property.
 * - **ImageComponent**: Handles individual image upload input.
 * - **RenderImage**: Displays the uploaded image with a delete option.
 * - **StatusComponent**: A radio group for selecting the property's status (for rent or sale).
 * - **TagsComponent**: Manages the selection of tags related to the property.
 * - **TagItem**: Represents a selectable tag with an icon.
 * 
 */

'use client'
import { Input } from "../ui/input"
import React, { useState, useEffect } from "react"
import { AiOutlineCamera, AiOutlineCloseCircle } from "react-icons/ai";
import Image from 'next/image'
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { FormItem, FormControl, FormLabel } from '../ui/form';
import { tags } from '@/constantes';
import { IconType } from 'react-icons/lib';
import clsx from 'clsx';
import { useToast } from '@/hooks/use-toast';
import { useStep1FormPropertyMediator } from '@/hooks/useStep1FormPropertyMediator';
import { useFormContext } from 'react-hook-form';
import { useImageDropzone } from "@/hooks/useImageDropzone";
import { useBlobUrl } from "@/hooks/useBlobUrl";

// Fonction utilitaire pour générer une clé unique pour les images
const generateImageKey = (image: File | string, index: number): string => {
    if (typeof image === 'string') {
        return `image-url-${image.slice(-10)}-${index}`;
    }
    return `image-file-${image.name}-${image.size}-${index}`;
};

//Images
export const ImagesComponent = () => {
    const { watch } = useFormContext();
    const images = watch("images") ?? [];
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3">
            <ImageUploader />
            {images.map((image: File | string, index: number) => (
                <ImageComponent key={generateImageKey(image, index)} index={index} />
            ))}
        </div>
    )
}

export const ImageUploader = () => {
    const { toast } = useToast();
    const mediator = useStep1FormPropertyMediator();
    
    const { getInputProps, getRootProps, isDragActive, isProcessing } = useImageDropzone({
        onFiles: (files) => {
            try {
                mediator.addImages(files);
            } catch (e) {
                toast({ title: "Erreur", description: "Impossible d'ajouter les images", variant: "destructive" });
            }
        }
    });

    return (
        <div {...getRootProps()} className={`border border-dashed h-40 md:h-[240px] flex justify-center items-center cursor-pointer ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}>
            <Input {...getInputProps()} disabled={isProcessing} />
            {isProcessing ? (
                <svg className="animate-spin w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
            ) : isDragActive ? (
                <p className="text-gray-500">Déposez vos images ici...</p>
            ) : (
                <AiOutlineCamera size={50} className='text-gray-500' />
            )}
        </div>
    );
};

export const ImageComponent = ({ index }: { index: number }) => {
    return (
        <div className='border border-dashed h-40 md:h-[240px] flex justify-center items-center'>
            <RenderImage index={index} />
        </div>
    );
}

export const RenderImage = ({ index }: { index: number }) => {
    const mediator = useStep1FormPropertyMediator();
    const image = mediator.getImageAt(index);
    const blobUrl = useBlobUrl(typeof image === "object" ? image : null);

    return (
        <React.Fragment>
            {
                image ? (
                    <div className='relative'>
                        <div className="absolute flex justify-end w-full" >
                            <Button
                                type='button'
                                variant={'ghost'}
                                className='p-1'
                                onClick={(event) => {
                                    event.stopPropagation();
                                    mediator.removeImage(index);
                                }}>
                                <AiOutlineCloseCircle color='red' size={25} />
                            </Button>
                        </div>
                        <div className='h-[150px] w-full md:h-[230px]'>
                            <Image
                                src={typeof image === 'string' ? image : blobUrl || ''}
                                alt="Selected Image"
                                sizes="100vw"
                                width={0}
                                height={0}
                                style={{ objectFit: 'fill' }}
                                className='w-full h-full'
                            />
                        </div>

                    </div>

                ) : (
                    <AiOutlineCamera size={50} className='text-gray-500' />
                )
            }
        </React.Fragment>
    )
}

//Status
const status = [
    {
        value: 'FOR_RENT',
        label: 'A louer'
    },
    {
        value: 'FOR_SALE',
        label: 'A vendre'
    }
]
export const StatusComponent = ({ field }: { field: any }) => {
    return (
        <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="flex gap-5"
        >
            {
                status.map((item) =>
                    <FormItem key={item.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value={item.value} />
                        </FormControl>
                        <FormLabel className="font-normal">
                            {item.label}
                        </FormLabel>
                    </FormItem>
                )
            }
        </RadioGroup>
    )
}

//Tags
export const TagsComponent = ({ field }: { field: any }) => {
    return (
        <div className='grid grid-cols-3 gap-2'>
            {
                [...tags].sort((a, b) => a.tagName.localeCompare(b.tagName, 'fr')).map((tag) => (
                    <TagItem key={tag.tagName} tag={tag} field={field} />
                ))
            }
        </div>
    )
}

export const TagItem = ({ tag, field }: { tag: { tagName: string, tagIcon: IconType }, field: any }) => {
    const [isActived, setIsActived] = useState(false)

    useEffect(() => {
        setIsActived(field.value?.includes(tag.tagName) ?? false)
    }, [field.value, tag.tagName])

    const handleSelectIcon = () => {
        const active = !isActived
        if (active) {
            if (field.value?.length < 6) {
                field.onChange([...(field.value ?? []), tag.tagName])
            }
        } else {
            field.onChange((field.value ?? []).filter((item: string) => item !== tag.tagName))
        }
    }

    return (
        <button
            type="button"
            className={clsx({
                "flex items-center gap-2 cursor-pointer text-gray-500 border-none bg-transparent p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200": !isActived,
                "flex items-center gap-2 text-[#e7c873] cursor-pointer border-none bg-transparent p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200": isActived,
            })}
            onClick={handleSelectIcon}
            aria-label={`${isActived ? 'Désélectionner' : 'Sélectionner'} le tag ${tag.tagName}`}
            aria-pressed={isActived}
        >
            <tag.tagIcon size={20} />
            <h2 className='text-[0.6rem] xl:text-lg'>{tag.tagName}</h2>
        </button>
    )
}
