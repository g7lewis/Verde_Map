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
      // Use FeatureLayer for better rendering of EPA facilities
      // Correct field names: FAC_NAICS_CODES, FAC_QTRS_IN_NC, FAC_CURR_SNC_FLG
      epaLayer = esriLeaflet.featureLayer({
        url: "https://echogeo.epa.gov/arcgis/rest/services/ECHO/Facilities/MapServer/0",
        where: "FAC_MAJOR_FLAG = 'Y' OR FAC_CURR_SNC_FLG = 'Y' OR FAC_QTRS_IN_NC > 0 OR FAC_NAICS_CODES LIKE '324%' OR FAC_NAICS_CODES LIKE '562%' OR FAC_NAICS_CODES LIKE '325%' OR FAC_NAICS_CODES LIKE '221%' OR FAC_NAICS_CODES LIKE '331%'",
        pointToLayer: function(_geojson: any, latlng: any) {
          return (window as any).L.circleMarker(latlng, {
            radius: 6,
            fillColor: "#ef4444",
            color: "#b91c1c",
            weight: 1,
            opacity: 0.9,
            fillOpacity: 0.7
          });
        }
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
