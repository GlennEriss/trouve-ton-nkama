import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SearchFormSchema, SearchFormSchemaType } from "@/models/schema";
import { useLocationGoogle } from "./use-location-google";

export const useFormGoogleLocation = () => {
    const { mediator } = useLocationGoogle();

    const form = useForm<SearchFormSchemaType>({
        resolver: zodResolver(SearchFormSchema),
        defaultValues: {
            searchText: '',
            province: '',
            city: '',
            street: '',
        },
    });
    const { watch } = form;
    const watchedProvince = watch('province');
    const watchedCity = watch('city');
    const watchedStreet = watch('street');
    mediator.setProvinceName(watchedProvince || '');
    mediator.setCityName(watchedCity || '');
    mediator.setStreetName(watchedStreet || '');
    return {
        form
    }
}