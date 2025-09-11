import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { AlgoliaContextType } from "@/providers/AlgoliaContext";

export class FormFilterSearchMediator {
    constructor(
        private form: UseFormReturn<FormFilterSchemaType>,
        private algolia: AlgoliaContextType,
    ) { }

    normalizeValues(data: FormFilterSchemaType) {
        let minPrice = Math.max(0, Number(data.minPrice) || 0);
        let maxPrice = Math.max(0, Number(data.maxPrice) || 0);

        if (minPrice >= maxPrice) {
            maxPrice = Infinity;
            this.form?.setValue("maxPrice", maxPrice);
        }

        const minArea = Math.max(0, Number(data.minArea) || 0);
        const maxArea = Math.max(0, Number(data.maxArea) || 0);
        const minRooms = Math.max(0, Number(data.minNbrRooms) || 0);
        const maxRooms = Math.max(0, Number(data.maxNbrRooms) || 0);

        return { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms };
    }

    updateContext(
        data: FormFilterSchemaType,
        normalized: ReturnType<FormFilterSearchMediator["normalizeValues"]>
    ) {
        const {
            setProvince, setCity, setStreet,
            setMinPrice, setMaxPrice, setMinArea, setMaxArea,
            setMinNbrRooms, setMaxNbrRooms, setTypeProperty,
            setStatus, setTags,
        } = this.algolia;

        const { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms } = normalized;

        // Définition des mappings
        const fieldMappings: { condition: any; setter: (v: any) => void; value: any }[] = [
            { condition: data.province, setter: setProvince, value: data.province },
            { condition: data.city, setter: setCity, value: data.city },
            { condition: data.street, setter: setStreet, value: data.street },
            { condition: data.minPrice, setter: setMinPrice, value: String(minPrice) },
            { condition: data.maxPrice, setter: setMaxPrice, value: String(maxPrice) },
            { condition: data.minArea, setter: setMinArea, value: String(minArea) },
            { condition: data.maxArea, setter: setMaxArea, value: String(maxArea) },
            { condition: data.minNbrRooms, setter: setMinNbrRooms, value: String(minRooms) },
            { condition: data.maxNbrRooms, setter: setMaxNbrRooms, value: String(maxRooms) },
            { condition: data.typeProperty?.length, setter: setTypeProperty, value: data.typeProperty },
            { condition: data.status?.length, setter: setStatus, value: data.status },
            { condition: data.tags?.length, setter: setTags, value: data.tags },
        ];

        // Application des mappings
        fieldMappings.forEach(({ condition, setter, value }) => {
            if (condition) setter(value);
        });
    }


    buildUrlParams(
        data: FormFilterSchemaType,
        normalized: ReturnType<FormFilterSearchMediator["normalizeValues"]>
    ) {
        const { searchText } = this.algolia;
        const { minPrice, maxPrice, minArea, maxArea, minRooms, maxRooms } = normalized;

        const params = new URLSearchParams();

        const mappings: { condition: any; key: string; value: string | string[] | any }[] = [
            { condition: searchText, key: "query", value: searchText },
            { condition: data.province, key: "province", value: data.province },
            { condition: data.city, key: "city", value: data.city },
            { condition: data.street, key: "street", value: data.street },
            { condition: minPrice, key: "minPrice", value: String(minPrice) },
            { condition: maxPrice && maxPrice !== Infinity, key: "maxPrice", value: String(maxPrice) },
            { condition: minArea, key: "minArea", value: String(minArea) },
            { condition: maxArea, key: "maxArea", value: String(maxArea) },
            { condition: minRooms, key: "minNbrRooms", value: String(minRooms) },
            { condition: maxRooms, key: "maxNbrRooms", value: String(maxRooms) },
            { condition: data.typeProperty?.length, key: "typeProperty", value: data.typeProperty?.join(",") },
            { condition: data.status?.length, key: "status", value: data.status?.join(",") },
            { condition: data.tags?.length, key: "tags", value: data.tags?.join(",") },
        ];

        mappings.forEach(({ condition, key, value }) => {
            if (condition && value) params.append(key, Array.isArray(value) ? value.join(",") : value);
        });

        return params;
    }

    resetForm() {
        this.form?.reset({
            province: '',
            city: '',
            street: '',
            minPrice: undefined,
            maxPrice: undefined,
            minArea: undefined,
            maxArea: undefined,
            minNbrRooms: undefined,
            maxNbrRooms: undefined,
            typeProperty: [],
            status: [],
            tags: []
        });
        this.algolia.clearFilters();
    }
}
