import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const greenIcon  = createIcon("green");
const redIcon    = createIcon("red");
const orangeIcon = createIcon("orange");
const blueIcon   = createIcon("blue");

// Auto fit map to route
function FitBounds({ latLngs }) {
  const map = useMap();
  useEffect(() => {
    if (latLngs && latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [latLngs, map]);
  return null;
}

function TripMap({ coordinates, stops }) {
  if (!coordinates || coordinates.length === 0) return null;

  const latLngs = coordinates.map((coord) => [coord[1], coord[0]]);
  const center = latLngs[0];

  const startCoord = latLngs[0];
  const endCoord = latLngs[latLngs.length - 1];

  const getIcon = (type) => {
    if (type === "pickup")  return greenIcon;
    if (type === "dropoff") return redIcon;
    if (type === "fuel")    return orangeIcon;
    if (type === "break")   return blueIcon;
    return new L.Icon.Default();
  };

  const getLabel = (type) => {
    if (type === "pickup")  return "📦 Pickup";
    if (type === "dropoff") return "🏁 Dropoff";
    if (type === "fuel")    return "⛽ Fuel Stop";
    if (type === "break")   return "☕ Rest Break";
    return type;
  };

  const getStopCoord = (stop) => {
    if (stop.lat && stop.lng) return [stop.lat, stop.lng];
    return latLngs[0];
  };

  return (
    <div style={{ height: "450px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto fit to route */}
        <FitBounds latLngs={latLngs} />

        {/* Route line */}
        <Polyline positions={latLngs} color="#3b82f6" weight={4} />

        {/* Start marker */}
        <Marker position={startCoord} icon={greenIcon}>
          <Popup>🚛 Start / Current Location</Popup>
        </Marker>

        {/* End marker */}
        <Marker position={endCoord} icon={redIcon}>
          <Popup>🏁 Final Dropoff</Popup>
        </Marker>

        {/* Stop markers */}
        {stops &&
          stops.map((stop, index) => {
            const coord = getStopCoord(stop);
            return (
              <Marker key={index} position={coord} icon={getIcon(stop.type)}>
                <Popup>
                  <strong>{getLabel(stop.type)}</strong>
                  <br />
                  Day {stop.day} — {stop.time}
                  <br />
                  Duration: {stop.duration}
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        display: "flex", gap: "16px", flexWrap: "wrap",
        marginTop: "10px", fontSize: "13px", color: "#555"
      }}>
        <span>🟢 Start / Pickup</span>
        <span>🔴 Dropoff</span>
        <span>🟠 Fuel Stop</span>
        <span>🔵 Rest Break</span>
      </div>
    </div>
  );
}

export default TripMap;