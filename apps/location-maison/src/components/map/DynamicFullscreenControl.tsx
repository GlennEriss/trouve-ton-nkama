import React, { useEffect, useState } from "react";
import "leaflet.fullscreen/Control.FullScreen.css"; // Import Fullscreen Control CSS

const DynamicFullscreenControl: React.FC<{ position: "topright" | "topleft" | "bottomright" | "bottomleft" }> = ({ position }) => {
  const [FullscreenControl, setFullscreenControl] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const loadFullscreenControl = async () => {
      if (typeof window !== "undefined") {
        try {
          // Import dynamically
          const module = await import("react-leaflet-fullscreen");
          setFullscreenControl(() => module.FullscreenControl);
        } catch (error) {
          console.error("Error loading FullscreenControl module:", error);
        }
      }
    };

    // Load the component
    loadFullscreenControl();
  }, []);

  if (!FullscreenControl) {
    return null;
  }

  return <FullscreenControl position={position} />;
};

export default DynamicFullscreenControl;
