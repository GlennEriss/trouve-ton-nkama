import { UseFormReturn } from "react-hook-form";
import { MAX_IMAGES_UPLOAD } from "@/constantes";

export class Step1FormPropertyMediator {
    private form: UseFormReturn<any>;

    constructor(form: UseFormReturn<any>) {
        this.form = form;
    }

    /** ===================== IMAGES ===================== */
    getImages = (): (File | string)[] => {
        return this.form.getValues("images") ?? [];
    };
    
    getImageAt = (index: number): File | string | undefined => {
        return this.getImages()[index];
    };

    addImages = (files: File[]) => {
        const current = this.getImages();
        this.form.setValue("images", [...current, ...files].slice(0, MAX_IMAGES_UPLOAD)); // max images
    };

    setImages = (files: (File | string)[]) => {
        this.form.setValue("images", files.slice(0, MAX_IMAGES_UPLOAD));
    };

    removeImage = (index: number) => {
        const current = this.getImages();
        const updated = [...current];
        updated.splice(index, 1);
        this.form.setValue("images", updated);
    };

    clearImages = () => {
        this.form.setValue("images", []);
    };

    /** ===================== STATUS ===================== */
    getStatus = (): string => this.form.getValues("status") ?? "";

    setStatus = (status: string) => {
        this.form.setValue("status", status);
    };

    /** ===================== TAGS ===================== */
    getTags = (): string[] => {
        return this.form.getValues("tags") ?? [];
    };

    toggleTag = (tag: string) => {
        const current = this.getTags();
        if (current.includes(tag)) {
            this.form.setValue("tags", current.filter((t) => t !== tag));
        } else if (current.length < 6) {
            this.form.setValue("tags", [...current, tag]);
        }
    };

    clearTags = () => {
        this.form.setValue("tags", []);
    };

    /** ===================== HELPERS ===================== */
    getValues = () => this.form.getValues();
    reset = () => this.form.resetField("images"); // utile si besoin seulement pour les images
}
