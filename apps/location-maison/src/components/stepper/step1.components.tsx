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
import { useDropzone } from 'react-dropzone'
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
import imageCompression from 'browser-image-compression';
import { useToast } from '@/hooks/use-toast';

//Images
export const ImagesComponent = ({ field }: { field: any }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3">
            <ImageUploader field={field} />
            {field.value?.map((image: File | string, index: number) => (
                <ImageComponent key={index} index={index} field={field} />
            ))}
        </div>
    )
}

export const ImageUploader = ({ field }: { field: any }) => {
    const { toast } = useToast();

    const { getInputProps, getRootProps, isDragActive } = useDropzone({
        maxFiles: 6,
        multiple: true,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
        },
        onDrop: async (acceptedFiles) => {
            const maxSizeInBytes = 300 * 1024;
            const currentFiles = field.value || [];
            const compressedFiles: File[] = [];

            for (const file of acceptedFiles) {
                try {
                    const compressedFile = await imageCompression(file, {
                        maxSizeMB: 0.3,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    });

                    if (compressedFile.size <= maxSizeInBytes) {
                        compressedFiles.push(compressedFile);
                    } else {
                        toast({
                            duration: 5000,
                            title: "Erreur",
                            description: `L'image "${file.name}" dépasse 300 Ko même après compression.`,
                            variant: "destructive",
                        });
                    }
                } catch (error: any) {
                    toast({
                        duration: 5000,
                        title: "Erreur",
                        description: error.message || "Une erreur est survenue.",
                        variant: "destructive",
                    });
                }
            }

            const newFiles = [...currentFiles, ...compressedFiles].slice(0, 6);
            field.onChange(newFiles);
            console.log('field',field)
            console.log('newFiles',newFiles)
        },
    });

    return (
        <div {...getRootProps()} className='border border-dashed h-40 md:h-[240px] flex justify-center items-center cursor-pointer'>
            <Input {...getInputProps()} />
            {isDragActive ? (
                <p className="text-gray-500">Déposez vos images ici...</p>
            ) : (
                <AiOutlineCamera size={50} className='text-gray-500' />
            )}
        </div>
    );
};

export const ImageComponent = ({ field, index }: { field: any, index: number }) => {
    const image: File | string | undefined = field.value && field.value[index];

    return (
        <div className='border border-dashed h-40 md:h-[240px] flex justify-center items-center'>
            <RenderImage image={image} field={field} index={index} />
        </div>
    );
}

export const RenderImage = ({ image, field, index }: { image: File | string | undefined, field: any, index: number }) => {
    const handleDeleteImage = () => {
        const currentFiles = field.value as any[] || [];
        const newFiles = currentFiles.slice(); // Copie du tableau
        newFiles.splice(index, 1); // Supprime l'image à cet index
        field.onChange(newFiles);
    };
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
                                    handleDeleteImage();
                                }}>
                                <AiOutlineCloseCircle color='red' size={25} />
                            </Button>
                        </div>
                        <div className='h-[150px] w-full md:h-[230px]'>
                            <Image
                                src={typeof image === 'string' ? image : URL.createObjectURL(image as File)}
                                alt="Selected Image"
                                sizes="100vw"
                                width={0}
                                height={0}
                                objectFit='fill'
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
                status.map((item, key) =>
                    <FormItem key={key} className="flex items-center space-x-3 space-y-0">
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
                tags.map((tag, key) => (
                    <TagItem key={key} tag={tag} field={field} />
                ))
            }
        </div>
    )
}

export const TagItem = ({ tag, field }: { tag: { tagName: string, tagIcon: IconType }, field: any }) => {
    const [isActived, setIsActived] = useState(false)

    useEffect(() => {
        setIsActived(field.value?.includes(tag.tagName) || false)
    }, [field.value, tag.tagName])

    const handleSelectIcon = () => {
        const active = !isActived
        if (active) {
            if (field.value?.length < 6) {
                field.onChange([...(field.value || []), tag.tagName])
            }
        } else {
            field.onChange((field.value || []).filter((item: string) => item !== tag.tagName))
        }
    }

    return (
        <div className={clsx({
            "flex items-center gap-2 cursor-pointer text-gray-500": !isActived,
            "flex items-center gap-2 text-[#e7c873] cursor-pointer": isActived,
        })} onClick={handleSelectIcon}>
            <tag.tagIcon size={20} />
            <h2 className='text-[0.6rem] xl:text-lg'>{tag.tagName}</h2>
        </div>
    )
}
