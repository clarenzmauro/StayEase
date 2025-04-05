import { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon } from 'ol/style';

interface PropertyMapProps {
  locationGeo: {
    latitude: number;
    longitude: number;
  };
}

const PropertyMap = ({ locationGeo }: PropertyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !locationGeo) return;

    // Convert coordinates to OpenLayers format
    const coordinates = fromLonLat([locationGeo.longitude, locationGeo.latitude]);

    // Create marker feature
    const marker = new Feature({
      geometry: new Point(coordinates),
    });

    // Style for the marker
    const markerStyle = new Style({
      image: new Icon({
        anchor: [0.5, 1], // Position the tip of the marker at the point
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: '/marker-icon.svg',
        scale: 1,
        color: '#FF385C' // StayEase brand color
      })
    });
    marker.setStyle(markerStyle);

    // Create vector layer for marker
    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [marker]
      })
    });

    // Initialize map if not already initialized
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM()
          }),
          vectorLayer
        ],
        view: new View({
          center: coordinates,
          zoom: 16, // Closer zoom to see the area better
          minZoom: 10, // Prevent zooming out too far
          maxZoom: 19 // Allow detailed zoom
        })
      });

      // Add click interaction to the marker
      mapInstanceRef.current.on('click', (event) => {
        const feature = mapInstanceRef.current?.forEachFeatureAtPixel(event.pixel, (feature) => feature);
        if (feature === marker) {
          const view = mapInstanceRef.current?.getView();
          view?.animate({
            center: coordinates,
            zoom: Math.min((view?.getZoom() || 16) + 1, 19),
            duration: 250
          });
        }
      });
    } else {
      // Update map view if map already exists
      mapInstanceRef.current.getView().animate({
        center: coordinates,
        duration: 250
      });
      vectorLayer.getSource()?.clear();
      vectorLayer.getSource()?.addFeature(marker);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [locationGeo]);

  return (
    <>
      <div className="py-8 px-4">
        <h2 className="text-xl font-semibold mb-2">Where you'll be</h2>
        <div 
          ref={mapRef} 
          className="w-full aspect-square overflow-hidden rounded-2xl" 
        />
      </div>

      <hr className="text-gray-200 border-t-16" />
    </>
  );
};

export default PropertyMap;
