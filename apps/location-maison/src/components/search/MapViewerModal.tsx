import React from 'react'
import dynamic from 'next/dynamic'
import { Button } from '../ui/button';
import { MapPin } from 'lucide-react';

const MAP_CENTER = { lat: 0.3476, lng: 9.4523 };

const GoogleMapViewer = dynamic(() => import('./GoogleMapViewer'), {
    ssr: false
})

export default function MapViewerModal() {
    const [showMap, setShowMap] = React.useState(false);
    return (
        <div className='flex justify-center'>
            <Button
                variant="outline"
                onClick={() => setShowMap(true)}
                className="border-primary dark:border-secondary text-primary dark:text-secondary hover:bg-secondary/10 dark:hover:bg-secondary/20 rounded-full px-6 py-2 flex items-center gap-2"
            >
                <MapPin className="w-4 h-4" />
                Voir sur la carte
            </Button>
            <GoogleMapViewer
                lat={MAP_CENTER.lat}
                lng={MAP_CENTER.lng}
                open={showMap}
                onOpenChange={setShowMap}
            />
        </div>
    )
}
