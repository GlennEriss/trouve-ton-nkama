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
import React from "react"
import { AiOutlineCamera, AiOutlineCloseCircle } from "react-icons/ai";
import Image from 'next/image'
import { Button } from '../ui/button';
import { FormItem, FormControl, FormLabel } from '../ui/form';
import { tags, MAX_TAGS } from '@/constantes';
import { IconType } from 'react-icons/lib';
import clsx from 'clsx';
import { useToast } from '@/hooks/use-toast';
import { useStep1FormPropertyMediator } from '@/hooks/useStep1FormPropertyMediator';
import { useFormContext } from 'react-hook-form';
import { useImageDropzone } from "@/hooks/useImageDropzone";
import { useBlobUrl } from "@/hooks/useBlobUrl";
import { MAX_IMAGES_UPLOAD } from "@/constantes";
import { InputApp } from "../shared/ui/InputApp";
import TextareaApp from "../shared/ui/TextareaApp";
import { InputNumberApp } from "../shared/ui/InputNumberApp";

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {images.length}/{MAX_IMAGES_UPLOAD} images
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <ImageUploader />
                {images.length > 0 && (
                    <ImageComponent key={generateImageKey(images[0], 0)} index={0} />
                )}
                {images.slice(1).map((image: File | string, index: number) => (
                    <ImageComponent key={generateImageKey(image, index + 1)} index={index + 1} />
                ))}
            </div>
        </div>
    )
}

export const ImageUploader = () => {
    const { toast } = useToast();
    const mediator = useStep1FormPropertyMediator();

    const { getInputProps, getRootProps, isDragActive, isProcessing } = useImageDropzone({
        onFiles: (files) => {
            try {
                const beforeCount = mediator.getImages().length;
                mediator.addImages(files);
                const afterCount = mediator.getImages().length;
                const addedCount = Math.max(afterCount - beforeCount, 0);

                if (addedCount > 0) {
                    toast({
                        title: "Images ajoutées",
                        description: `${addedCount} image(s) ajoutée(s) avec succès`,
                        variant: "default"
                    });
                }

                if (files.length > addedCount) {
                    toast({
                        title: "Certaines images n'ont pas été ajoutées",
                        description: "La limite maximale de 10 images est atteinte.",
                        variant: "destructive"
                    });
                }
            } catch (e) {
                toast({ title: "Erreur", description: "Impossible d'ajouter les images", variant: "destructive" });
            }
        },
        onFeedback: (feedback) => {
            const messages: string[] = [];

            if (feedback.invalidTypeCount > 0) {
                messages.push(`${feedback.invalidTypeCount} image(s) ignorée(s): format non supporté (PNG/JPG/JPEG/WEBP).`);
            }
            if (feedback.tooManyFilesCount > 0) {
                messages.push(`Maximum ${MAX_IMAGES_UPLOAD} images par ajout.`);
            }
            if (feedback.oversizedAfterCompressionCount > 0) {
                messages.push(`${feedback.oversizedAfterCompressionCount} image(s) trop lourde(s) même après compression (limite 300 Ko).`);
            }
            if (feedback.compressionErrorCount > 0) {
                messages.push(`${feedback.compressionErrorCount} image(s) n'ont pas pu être compressée(s).`);
            }

            if (messages.length > 0) {
                toast({
                    title: "Certaines images n'ont pas été ajoutées",
                    description: messages.join(' '),
                    variant: "destructive"
                });
            }
        }
    });

    return (
        <div
            {...getRootProps()}
            className={clsx(
                "group relative border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out",
                "hover:border-[#156B68] hover:bg-[#156B68]/5 dark:hover:bg-[#156B68]/10",
                "focus-within:ring-2 focus-within:ring-[#156B68] focus-within:ring-offset-2",
                "min-h-[160px] md:min-h-[180px] lg:min-h-[200px] flex flex-col justify-center items-center cursor-pointer",
                "bg-gray-50/50 dark:bg-gray-800/50",
                {
                    "border-[#156B68] bg-[#156B68]/5 dark:bg-[#156B68]/10": isDragActive,
                    "opacity-60 pointer-events-none": isProcessing,
                    "border-gray-300 dark:border-gray-600": !isDragActive && !isProcessing
                }
            )}
        >
            <Input {...getInputProps()} disabled={isProcessing} className="sr-only" />

            <div className="flex flex-col items-center space-y-3 p-4 md:p-6">
                {isProcessing ? (
                    <>
                        <div className="relative">
                            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-[#156B68]/20 border-t-[#156B68] rounded-full animate-spin"></div>
                            <AiOutlineCamera className="absolute inset-0 m-auto w-5 h-5 md:w-6 md:h-6 text-[#156B68]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-[#156B68] dark:text-[#156B68]/80">
                                Traitement en cours...
                            </p>
                            <p className="text-xs text-[#156B68]/70 dark:text-[#156B68]/60 mt-1">
                                Compression des images
                            </p>
                        </div>
                    </>
                ) : isDragActive ? (
                    <>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-[#156B68]/10 dark:bg-[#156B68]/20 rounded-full flex items-center justify-center animate-pulse">
                            <AiOutlineCamera className="w-5 h-5 md:w-6 md:h-6 text-[#156B68] dark:text-[#156B68]/80" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-[#156B68] dark:text-[#156B68]/80">
                                Déposez vos images ici
                            </p>
                            <p className="text-xs text-[#156B68]/70 dark:text-[#156B68]/60 mt-1">
                                Relâchez pour ajouter
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-[#156B68]/10 dark:group-hover:bg-[#156B68]/20 group-hover:scale-110 transition-all duration-200">
                            <AiOutlineCamera className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400 group-hover:text-[#156B68] dark:group-hover:text-[#156B68]/80 transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="hidden lg:block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#156B68] dark:group-hover:text-[#156B68]/80 transition-colors">
                                Ajouter des images
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-[#156B68]/70 dark:group-hover:text-[#156B68]/60 transition-colors">
                                Cliquez ou glissez-déposez
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const ImageComponent = ({ index }: { index: number }) => {
    return (
        <div className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
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
            {image ? (
                <div className="relative w-full h-full">
                    {/* Bouton de suppression */}
                    <Button
                        type='button'
                        variant={'ghost'}
                        size="sm"
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500/90 hover:bg-red-600 text-white p-1 h-8 w-8 rounded-full shadow-lg"
                        onClick={(event) => {
                            event.stopPropagation();
                            mediator.removeImage(index);
                        }}
                    >
                        <AiOutlineCloseCircle size={16} />
                    </Button>

                    {/* Image */}
                    <div className="relative w-full h-full">
                        <Image
                            src={typeof image === 'string' ? image : blobUrl || ''}
                            alt={`Image ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            style={{ objectFit: 'cover' }}
                            className="transition-transform duration-200 group-hover:scale-105"
                        />
                    </div>

                    {/* Overlay au survol */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

                    {/* Numéro de l'image */}
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {index + 1}
                    </div>
                    </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                    <AiOutlineCamera size={32} />
                    <span className="text-xs mt-2">Image manquante</span>
                </div>
            )}
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
export const StatusComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const currentStatus = watch("status");

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status.map((item) => (
                    <FormItem key={item.value} className="space-y-0">
                        <FormControl>
                            <div
                                className={clsx(
                                    "relative flex items-center space-x-3 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200",
                                    "hover:border-[#156B68] hover:bg-[#156B68]/5 dark:hover:bg-[#156B68]/10",
                                    {
                                        "border-[#156B68] bg-[#156B68]/5 dark:bg-[#156B68]/10": currentStatus === item.value,
                                        "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800": currentStatus !== item.value
                                    }
                                )}
                                onClick={() => mediator.setStatus(item.value)}
                            >
                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                    style={{
                                        borderColor: currentStatus === item.value ? '#156B68' : '#d1d5db',
                                        backgroundColor: currentStatus === item.value ? '#156B68' : 'transparent'
                                    }}>
                                    {currentStatus === item.value && (
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <FormLabel className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                                        {item.label}
                                    </FormLabel>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {item.value === 'FOR_RENT'
                                            ? 'Propriété disponible à la location'
                                            : 'Propriété disponible à la vente'
                                        }
                                    </p>
                                </div>
                                {currentStatus === item.value && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-2 h-2 bg-[#156B68] rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </FormControl>
                    </FormItem>
                ))}
            </div>
        </div>
    )
}

//Tags
export const TagsComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const selectedTags = watch("tags") ?? [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTags.length}/{MAX_TAGS} sélectionnés
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...tags]
                    .sort((a, b) => a.tagName.localeCompare(b.tagName, "fr"))
                    .map((tag) => (
                        <TagItem
                            key={tag.tagName}
                            tag={tag}
                            isActive={selectedTags.includes(tag.tagName)}
                            onToggle={() => {
                                mediator.toggleTag(tag.tagName);
                            }}
                        />
                    ))}
            </div>
        </div>
    );
};

type TagItemProps = {
    tag: { tagName: string; tagIcon: IconType };
    isActive: boolean;
    onToggle: () => void;
};

export const TagItem = ({ tag, isActive, onToggle }: TagItemProps) => {
    return (
        <button
            type="button"
            className={clsx(
                "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group",
                "hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2",
                {
                    // État actif
                    "border-[#156B68] bg-[#156B68]/10 text-[#156B68] shadow-sm": isActive,
                    // État inactif
                    "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-[#156B68]/50 hover:bg-[#156B68]/5": !isActive,
                }
            )}
            onClick={onToggle}
            aria-label={`${isActive ? "Désélectionner" : "Sélectionner"} le tag ${tag.tagName}`}
            aria-pressed={isActive}
        >
            {/* Icône */}
            <div className={clsx(
                "p-2 rounded-lg transition-colors duration-200",
                {
                    "bg-[#156B68]/20": isActive,
                    "bg-gray-100 dark:bg-gray-700 group-hover:bg-[#156B68]/10": !isActive,
                }
            )}>
                <tag.tagIcon size={20} />
            </div>

            {/* Nom du tag */}
            <span className={clsx(
                "text-xs font-medium text-center leading-tight",
                {
                    "text-[#156B68]": isActive,
                    "text-gray-600 dark:text-gray-400 group-hover:text-[#156B68]": !isActive,
                }
            )}>
                {tag.tagName}
            </span>

            {/* Indicateur de sélection */}
            {isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#156B68] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
            )}
        </button>
    );
};

export const TitleComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const title = watch("title");
    return (
        <InputApp value={title} onChange={(e) => mediator.setTitle(e.target.value)} />
    )
}

export const DescriptionComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const description = watch("description");
    return (
        <TextareaApp value={description} onChange={(e) => mediator.setDescription(e.target.value)} />
    )
}

export const AreaComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const area = watch("area");
    return (
        <InputNumberApp
            step={10}
            value={area}
            onChange={(value) => mediator.setArea(Number(value))}
        />
    )
}

export const PriceComponent = () => {
    const mediator = useStep1FormPropertyMediator();
    const { watch } = useFormContext();
    const price = watch("price");
    return (
        <InputNumberApp
            step={10000}
            value={price}
            onChange={(value) => {
                mediator.setPrice(Number(value));
            }}
        />
    )
}
