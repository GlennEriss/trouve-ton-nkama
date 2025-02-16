"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useMap } from "react-leaflet";
import { useFormContext } from "react-hook-form";

// Import dynamique des composants React-Leaflet
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);

const LIBREVILLE_COORDINATES: [number, number] = [0.3901, 9.4536]; // Coordonnées GPS de Libreville

// Composant pour déplacer la vue lorsque le marqueur change
const MapViewUpdater = ({ coordinates }: { coordinates: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(coordinates, 12, { animate: true });
    }, [coordinates, map]);
    return null;
};

const MapForm = () => {
    // Accès aux méthodes de react-hook-form
    const { setValue } = useFormContext();

    const [location, setLocation] = useState("");
    const [coordinates, setCoordinates] = useState<[number, number]>(LIBREVILLE_COORDINATES);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [L, setL] = useState<any>(null);
    const [pinIcon, setPinIcon] = useState<any>(null);

    // Charger Leaflet côté client et définir l'icône personnalisée
    useEffect(() => {
        const loadLeaflet = async () => {
            if (typeof window !== "undefined") {
                const leaflet = await import("leaflet");
                setL(leaflet);

                setPinIcon(
                    new leaflet.Icon({
                        iconUrl:
                            "https://upload.wikimedia.org/wikipedia/commons/8/88/Map_marker.svg",
                        iconSize: [30, 40],
                        iconAnchor: [15, 40],
                        popupAnchor: [0, -40],
                        shadowUrl:
                            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                        shadowSize: [41, 41],
                        shadowAnchor: [13, 41],
                    })
                );
            }
        };

        loadLeaflet();
    }, []);

    // Recherche de localité via l'API Photon
    const searchLocation = async () => {
        if (!location.trim()) return;

        try {
            const response = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(
                    location
                )}&lat=0.7&lon=11.5&limit=10`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                setSearchResults(data.features);
                setError(null);
            } else {
                setSearchResults([]);
                setError("Localité introuvable. Essayez une autre recherche.");
            }
        } catch (err) {
            setError("Erreur de connexion. Vérifiez votre connexion internet.");
        }
    };

    // Sélection d'un résultat Photon et mise à jour des champs du formulaire
    const selectLocation = (result: any) => {
        const lat = result.geometry.coordinates[1];
        const lon = result.geometry.coordinates[0];
        const { name, city, state: province, country, countrycode: countryCode } = result.properties;
        console.log(result)
        // Mise à jour du marqueur sur la carte
        setCoordinates([lat, lon]);

        // Mise à jour des champs dans le formulaire
        setValue("street", name || "");
        setValue("city", city || name || "");
        setValue("province", province || "");
        setValue("country", country || "");
        setValue("countryCode", countryCode || "");
        setValue("latitude", lat);
        setValue("longitude", lon);

        // Masquer la liste de résultats
        setSearchResults([]);
    };

    return (
        <section className="h-[600px] w-full flex flex-col gap-4">
            {/* Barre de recherche */}
            <div className="flex gap-2 items-center bg-gray-100 p-2 rounded-md shadow-md">
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Rechercher une localité au Gabon..."
                    className="flex-1 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="button"
                    onClick={searchLocation}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                    Rechercher
                </button>
            </div>

            {/* Affichage des erreurs */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Liste des résultats trouvés */}
            {searchResults.length > 0 && (
                <div className="bg-white shadow-md rounded-md p-2 max-h-60 overflow-auto">
                    <p className="font-semibold">Sélectionnez une localité :</p>
                    {searchResults.map((result, index) => (
                        <button
                            type="button"
                            key={index}
                            onClick={() => selectLocation(result)}
                            className="block w-full text-left p-2 hover:bg-gray-200 rounded-md"
                        >
                            {result.properties.name || "Localité inconnue"}
                        </button>
                    ))}
                </div>
            )}

            {/* Affichage de la carte */}
            <div className="h-[500px] w-full">
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

                    {/* Mise à jour automatique de la vue en fonction du marqueur */}
                    <MapViewUpdater coordinates={coordinates} />

                    {/* Marqueur sur la position sélectionnée */}
                    {L && pinIcon && (
                        <Marker position={coordinates} icon={pinIcon}>
                            <Popup>Localité sélectionnée</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
        </section>
    );
};

export default MapForm;