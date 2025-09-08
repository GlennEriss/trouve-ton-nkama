import { UseFormReturn } from "react-hook-form";
import { MAX_IMAGES_UPLOAD, MAX_TAGS } from "@/constantes";

export class Step1FormPropertyMediator {
    private form: UseFormReturn<any>;

    constructor(form: UseFormReturn<any>) {
        this.form = form;
    }
    /** ===================== TITLE ===================== */
    getTitle = (): string => this.form.getValues("title") ?? "";
    setTitle = (title: string) => this.form.setValue("title", title);

    /** ===================== DESCRIPTION ===================== */
    getDescription = (): string => this.form.getValues("description") ?? "";
    setDescription = (desc: string) => this.form.setValue("description", desc);

    /** ===================== AREA ===================== */
    getArea = (): number => this.form.getValues("area") ?? 0;
    setArea = (area: number) => this.form.setValue("area", area);

    /** ===================== PRICE ===================== */
    getPrice = (): number => {
        const value = this.form.getValues("price") ?? 0;
        return value;
    };
    setPrice = (price: number) => {
        this.form.setValue("price", price);
    };
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
            const newTags = current.filter((t) => t !== tag);
            this.form.setValue("tags", newTags, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        } else if (current.length < MAX_TAGS) {
            const newTags = [...current, tag];
            this.form.setValue("tags", newTags, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
        // Force trigger pour s'assurer que le composant se re-render
        this.form.trigger("tags");
    };

    clearTags = () => {
        this.form.setValue("tags", []);
    };

    /** ===================== HELPERS ===================== */
    getValues = () => this.form.getValues();
    reset = () => this.form.resetField("images"); // utile si besoin seulement pour les images
}
