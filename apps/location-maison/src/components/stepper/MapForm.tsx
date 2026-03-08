"use client";
const LOCAL_STORAGE_KEY = "location-cache";
let searchCache = new Map<string, any[]>();

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@/hooks/use-location';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.stepper.map-form');

const MapForm = () => {
    // Accès aux méthodes de react-hook-form
    const { setValue } = useFormContext();
    const queryClient = useQueryClient();
    const { data: locations } = useLocation();

    const [location, setLocation] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Charger le cache depuis localStorage au chargement du composant
    useEffect(() => {
        const rawCache = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawCache) {
            try {
                const parsed = JSON.parse(rawCache);
                searchCache = new Map(Object.entries(parsed));
            } catch (err) {
                logger.warn('Erreur de parsing du cache localStorage', { err });
            }
        }
    }, []);

    // Recherche de localité via l'API Photon
    const searchLocation = async () => {
        if (!location.trim()) return;
        setIsLoading(true);
        const query = location.toLowerCase().trim() + ' Gabon';

        if (searchCache.has(query)) {
            setSearchResults(searchCache.get(query)!);
            setError(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=0.7&lon=11.5&limit=10`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                searchCache.set(query, data.features);
                localStorage.setItem(
                    LOCAL_STORAGE_KEY,
                    JSON.stringify(Object.fromEntries(searchCache))
                );
                setSearchResults(data.features);
                setError(null);
            } else {
                setSearchResults([]);
                setError("Localité introuvable. Essayez une autre recherche.");
            }
        } catch (err) {
            logger.error('Erreur lors de la recherche de localisation', { err, query });
            setError("Erreur de connexion. Vérifiez votre connexion internet.");
        } finally {
            setIsLoading(false);
        }
    };

    // Ajout d'une rue dans le cache local React Query
    const handleAddStreet = (province: string, city: string, newStreet: string) => {
        queryClient.setQueryData(['locations'], (oldData: any) => {
            if (!oldData) return oldData;
            // Copie profonde pour éviter de muter le cache directement
            const newData = JSON.parse(JSON.stringify(oldData));
            if (!newData[province]) newData[province] = {};
            if (!newData[province][city]) newData[province][city] = [];
            if (!newData[province][city].includes(newStreet)) {
                newData[province][city].push(newStreet);
                newData[province][city].sort((a: string, b: string) => a.localeCompare(b, 'fr'));
            }
            return newData;
        });
    };

    // Sélection d'un résultat Photon et mise à jour des champs du formulaire
    const selectLocation = (result: any) => {
        const lat = result.geometry.coordinates[1];
        const lon = result.geometry.coordinates[0];
        const { name, city, state: province, country, countrycode: countryCode } = result.properties;

        // Vérifier si la rue existe déjà dans les données
        const streetExists =
            province &&
            city &&
            name &&
            locations &&
            locations[province] &&
            locations[province][city] &&
            locations[province][city].includes(name);

        if (!streetExists && province && city && name) {
            handleAddStreet(province, city, name);
            // Attendre que le cache soit à jour avant de setter la valeur dans le formulaire
            setTimeout(() => {
                setValue("province", province ?? "");
                setValue("city", city ?? name ?? "");
                setValue("street", name ?? "");
                setValue("country", country ?? "");
                setValue("countryCode", countryCode ?? "");
                setValue("latitude", lat);
                setValue("longitude", lon);
            }, 5);
        } else {
            setValue("province", province ?? "");
            setValue("city", city ?? name ?? "");
            setValue("street", name ?? "");
            setValue("country", country ?? "");
            setValue("countryCode", countryCode ?? "");
            setValue("latitude", lat);
            setValue("longitude", lon);
        }

        setSearchResults([]);
    };

    useEffect(() => {
        // Lire le draft du localStorage
        const draft = localStorage.getItem('property_form_draft');
        if (!draft) return;
        try {
            const parsed = JSON.parse(draft);
            const { province, city, street } = parsed;
            // Vérifier si la rue existe déjà dans le cache
            const streetExists =
                province &&
                city &&
                street &&
                locations &&
                locations[province] &&
                locations[province][city] &&
                locations[province][city].includes(street);

            if (!streetExists && province && city && street) {
                handleAddStreet(province, city, street);
            }
        } catch (e) {
            // Draft corrompu, ignorer
        }
    }, [locations]);

    return (
        <section className="w-full flex flex-col gap-4">
            {/* Barre de recherche */}
            <div className="flex gap-2 items-center bg-gray-100 dark:bg-gray-800 p-2 rounded-md shadow-md">
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Rechercher une localité au Gabon..."
                    className="flex-1 p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="button"
                    onClick={searchLocation}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition flex items-center justify-center min-w-[120px]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <AiOutlineLoading3Quarters className="animate-spin mr-2" size={20} />
                    ) : null}
                    {isLoading ? 'Recherche...' : 'Rechercher'}
                </button>
            </div>

            {/* Affichage des erreurs */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Liste des résultats trouvés */}
            {searchResults.length > 0 && (
                <div className="bg-white dark:bg-gray-900 shadow-md rounded-md p-2 max-h-60 overflow-auto">
                    <p className="font-semibold">Sélectionnez une localité :</p>
                    {searchResults.map((result, index) => (
                        <button
                            type="button"
                            key={`${result.properties.name}-${index}`}
                            onClick={() => selectLocation(result)}
                            className="block w-full text-left p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-black dark:text-white"
                        >
                            {result.properties.name ?? "Localité inconnue"}
                        </button>
                    ))}
                </div>
            )}

            {   /* Affichage de la carte */}
            {/* <div className="h-[500px] w-full">
                <MapContainer
                    center={coordinates}
                    zoom={12}
                    style={{ height: "100%", width: "100%", borderRadius: "10px" }}
                    className="h-full w-full z-10"
                    scrollWheelZoom={true}
                    zoomControl={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    <MapViewUpdater coordinates={coordinates} />

                    {L && pinIcon && (
                        <Marker position={coordinates} icon={pinIcon}>
                            <Popup>Localité sélectionnée</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div> */}
        </section>
    );
};

export default MapForm;
