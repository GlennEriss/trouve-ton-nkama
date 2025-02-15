"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import DynamicFullscreenControl from "./DynamicFullscreenControl";

// Import dynamique des composants Leaflet
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
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import("react-leaflet").then((mod) => mod.ZoomControl),
  { ssr: false }
);

interface House {
  id: string;
  title: string;
  location: { latitude: number; longitude: number };
  city: string;
  street: string;
  typeProperty: string;
  price: number;
}

export interface Neighborhood {
  name: string;
  coordinates: [number, number][]; // Array of [latitude, longitude] pairs
}

interface MapComponentProps {
  houses: House[];
  neighborhoods: Neighborhood[];
}

const MapComponent: React.FC<MapComponentProps> = ({
  houses,
  neighborhoods,
}) => {
  const [L, setL] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.39, 9.45]); // Par défaut, Libreville
  const [hoveredNeighborhood, setHoveredNeighborhood] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window !== "undefined") {
        const leaflet = await import("leaflet");
        await import("leaflet-fullscreen");
        setL(leaflet);
      }
    };

    loadLeaflet();
  }, []);

  const pinIcon = L
    ? new L.Icon({
        iconUrl:
          "https://upload.wikimedia.org/wikipedia/commons/8/88/Map_marker.svg", // Une épingle standard
        iconSize: [20, 30], // Taille de l'icône
        iconAnchor: [15, 40], // Ancre pour aligner correctement le marqueur
        popupAnchor: [0, -40], // Position du popup par rapport au marqueur
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png", // Ombre par défaut Leaflet
        shadowSize: [31, 31], // Taille de l'ombre
        shadowAnchor: [13, 41], // Alignement de l'ombre avec le marqueur
      })
    : null;

  if (!L || !pinIcon) {
    return (
      <div className="loading-container bg-white w-full h-full rounded-[10px]">
        <div className="loading-rectangle"></div>
        <div className="loading-rectangle"></div>
        <div className="loading-rectangle"></div>
      </div>
    );
  }

  const handlePolygonMouseOver = (event: any, name: string) => {
    setHoveredNeighborhood(name);
    event.target.setStyle({
      fillColor: "#FFB6C1", // Rose clair
      fillOpacity: 0.5,
      color: "#FF69B4", // Rose vif
      weight: 2,
    });
  };

  const handlePolygonMouseOut = (event: any) => {
    setHoveredNeighborhood(null);
    event.target.setStyle({
      fillColor: "#87CEFA", // Bleu ciel
      fillOpacity: 0.4,
      color: "#4682B4", // Bleu acier
      weight: 1,
    });
  };

  const isMatchingNeighborhood = (neighborhoodName: string): boolean => {
    return neighborhoods.some(
      (neighborhood) => neighborhood.name === neighborhoodName
    );
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={15}
      style={{ height: "100%", width: "100%", borderRadius: "10px" }}
      className="h-full w-full z-10"
      zoomControl={false}
    >
      <DynamicFullscreenControl position="topright" />
      {typeof window !== "undefined" && ZoomControl && (
        <ZoomControl position="bottomright" />
      )}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">Carto</a>'
      />

      {neighborhoods.map((neighborhood) => (
        <Polygon
          key={neighborhood.name}
          positions={neighborhood.coordinates}
          pathOptions={{
            fillColor: isMatchingNeighborhood(neighborhood.name)
              ? "#FFD700" // Doré pour correspondance
              : "#87CEFA", // Bleu ciel pour défaut
            fillOpacity: hoveredNeighborhood === neighborhood.name ? 0.6 : 0.4,
            color: "#4682B4", // Bordure bleue acier
            weight: 1.5,
          }}
          eventHandlers={{
            mouseover: (event) =>
              handlePolygonMouseOver(event, neighborhood.name),
            mouseout: handlePolygonMouseOut,
          }}
        >
          <Popup>
            <strong>{neighborhood.name}</strong>
          </Popup>
        </Polygon>
      ))}

      {houses.map((house) => (
        <Marker
          key={house.id}
          position={
            [house.location.latitude, house.location.longitude] as [
              number,
              number
            ]
          }
          icon={pinIcon}
        >
          <Popup>
            <strong>{house.title}</strong>
            <br />
            {house.city}, {house.street}
            <br />
            Prix: {house.price} F CFA
            <br />
            Type: {house.typeProperty}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
