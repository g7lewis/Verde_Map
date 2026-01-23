import { useEffect } from "react";
import { useMap } from "react-leaflet";
import * as esriLeaflet from "esri-leaflet";

interface EsriLayersProps {
  showEpaEcho: boolean;
  showGemsWater: boolean;
}

export function EsriLayers({ showEpaEcho, showGemsWater }: EsriLayersProps) {
  const map = useMap();

  useEffect(() => {
    let epaLayer: any = null;
    
    if (showEpaEcho) {
      epaLayer = esriLeaflet.dynamicMapLayer({
        url: "https://echogeo.epa.gov/arcgis/rest/services/ECHO/Facilities/MapServer",
        opacity: 0.7,
        layers: [0],
      });
      epaLayer.addTo(map);
    }

    return () => {
      if (epaLayer) {
        map.removeLayer(epaLayer);
      }
    };
  }, [map, showEpaEcho]);

  useEffect(() => {
    let gemsLayer: any = null;
    
    if (showGemsWater) {
      gemsLayer = esriLeaflet.dynamicMapLayer({
        url: "https://geoportal.bafg.de/arcgis/rest/services/GEMSTAT/STATION_METADATA_MAP/MapServer",
        opacity: 0.8,
        layers: [0],
      });
      gemsLayer.addTo(map);
    }

    return () => {
      if (gemsLayer) {
        map.removeLayer(gemsLayer);
      }
    };
  }, [map, showGemsWater]);

  return null;
}
