import { useQuery, queryOptions } from '@tanstack/react-query';
import { Province } from '@/models/province';
import { City } from '@/models/city';
import { Street } from '@/models/street';

/**
 * Custom hook to get the complete location hierarchy (provinces, cities, streets)
 * with Redis caching and React Query.
 * @param {string | undefined} selectedProvinceId - The selected province ID.
 * @param {string | undefined} selectedCityId - The selected city ID.
 * @returns {object} - React Query response containing provinces, cities, and streets.
 */
export function useLocationHierarchy(selectedProvinceId?: string, selectedCityId?: string) {
  // Fetch all provinces
  const provincesQuery = useQuery(queryOptions({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await fetch('/api/location/provinces');
      if (!response.ok) {
        throw new Error('Failed to fetch provinces');
      }
      const data = await response.json();
      return data.provinces as Province[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));

  // Fetch cities for selected province
  const citiesQuery = useQuery(queryOptions({
    queryKey: ['cities', selectedProvinceId],
    queryFn: async () => {
      if (!selectedProvinceId) throw new Error('Province ID is required to fetch cities.');
      const response = await fetch(`/api/location/cities?provinceId=${selectedProvinceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cities');
      }
      const data = await response.json();
      return data.cities as City[];
    },
    enabled: !!selectedProvinceId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));

  // Fetch streets for selected city
  const streetsQuery = useQuery(queryOptions({
    queryKey: ['streets', selectedCityId],
    queryFn: async () => {
      if (!selectedCityId) throw new Error('City ID is required to fetch streets.');
      const response = await fetch(`/api/location/streets?cityId=${selectedCityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch streets');
      }
      const data = await response.json();
      return data.streets as Street[];
    },
    enabled: !!selectedCityId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  }));

  return {
    provinces: provincesQuery.data || [],
    cities: citiesQuery.data || [],
    streets: streetsQuery.data || [],
    isLoading: provincesQuery.isLoading || citiesQuery.isLoading || streetsQuery.isLoading,
    isError: provincesQuery.isError || citiesQuery.isError || streetsQuery.isError,
    error: provincesQuery.error || citiesQuery.error || streetsQuery.error,
    refetchProvinces: provincesQuery.refetch,
    refetchCities: citiesQuery.refetch,
    refetchStreets: streetsQuery.refetch,
  };
}
