import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { AlgoliaContextType } from "@/providers/AlgoliaContext";

export class FormFilterSearchMediator {
    constructor(
        private form: UseFormReturn<FormFilterSchemaType>,
        private algolia: AlgoliaContextType,
    ) { }

    normalizeValues(data: FormFilterSchemaType) {
        const normalize = (value: unknown) => {
            if (value === '' || value === null || value === undefined) return undefined;
            const number = Number(value);
            return Number.isFinite(number) ? Math.max(0, number) : undefined;
        };

        const minPrice = normalize(data.minPrice);
        let maxPrice = normalize(data.maxPrice);
        if (minPrice !== undefined && maxPrice !== undefined && minPrice >= maxPrice) {
            maxPrice = undefined;
            this.form?.setValue("maxPrice", undefined);
        }

        const minArea = normalize(data.minArea);
        let maxArea = normalize(data.maxArea);
        if (minArea !== undefined && maxArea !== undefined && minArea >= maxArea) {
            maxArea = undefined;
            this.form?.setValue("maxArea", undefined);
        }

        const minRooms = normalize(data.minNbrRooms);
        let maxRooms = normalize(data.maxNbrRooms);
        if (minRooms !== undefined && maxRooms !== undefined && minRooms >= maxRooms) {
            maxRooms = undefined;
            this.form?.setValue("maxNbrRooms", undefined);
        }

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

        setProvince(data.province ?? '');
        setCity(data.city ?? '');
        setStreet(data.street ?? '');
        setMinPrice(minPrice === undefined ? '' : String(minPrice));
        setMaxPrice(maxPrice === undefined ? '' : String(maxPrice));
        setMinArea(minArea === undefined ? '' : String(minArea));
        setMaxArea(maxArea === undefined ? '' : String(maxArea));
        setMinNbrRooms(minRooms === undefined ? '' : String(minRooms));
        setMaxNbrRooms(maxRooms === undefined ? '' : String(maxRooms));
        setTypeProperty(data.typeProperty ?? []);
        setStatus(data.status ?? []);
        setTags(data.tags ?? []);
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
            { condition: maxPrice, key: "maxPrice", value: String(maxPrice) },
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
