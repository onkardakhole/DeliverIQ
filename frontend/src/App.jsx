import { useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    useMapEvents
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix 1: react-leaflet's default marker icon points at image paths that
// break under bundlers (Vite/webpack) because the URLs get rewritten.
// Every non-warehouse marker was silently rendering with a broken icon.
// We avoid the whole class of bug by giving customer markers their own
// divIcon (same technique already used for the warehouse), so nothing
// depends on Leaflet's bundler-unfriendly default image URLs.
const warehouseIcon = L.divIcon({
    className: "",
    html: '<div style="font-size:30px;">🏭</div>',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

const customerIcon = L.divIcon({
    className: "",
    html: '<div style="font-size:26px;">📍</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

// A palette so each delivery partner's route is visually distinct.
const ROUTE_COLORS = [
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2"
];

function LocationSelector({ onLocationSelect }) {
    useMapEvents({
        click(event) {
            onLocationSelect(event.latlng);
        }
    });

    return null;
}

// Fix 2: Date.now() is not guaranteed unique if two locations are added
// within the same millisecond (e.g. rapid clicks), which would break
// React's key uniqueness assumption. A simple incrementing counter is safe.
let nextLocationId = 1;

function App() {
    const [locations, setLocations] = useState([]);
    const [deliveryPartners, setDeliveryPartners] = useState(1);
    const [message, setMessage] = useState("");
    const [optimizedRoutes, setOptimizedRoutes] = useState([]);
const [optimizedResults, setOptimizedResults] = useState([]);
const [isSending, setIsSending] = useState(false);

    function addLocation(latlng) {
        const newLocation = {
            id: nextLocationId++,
            name:
                locations.length === 0
                    ? "Warehouse"
                    : `Customer ${locations.length}`,
            latitude: latlng.lat,
            longitude: latlng.lng
        };

        setLocations((prev) => [...prev, newLocation]);
    }

    function removeLocation(id) {
        setLocations((prev) => prev.filter((loc) => loc.id !== id));
    }

    // Fix 3: the number input had min="1" but HTML `min` is only a hint —
    // it doesn't stop the user from typing 0 or a negative number, which
    // would silently break the backend request. Clamp explicitly instead.
    function handleDeliveryPartnersChange(event) {
        const value = Number(event.target.value);
        setDeliveryPartners(Number.isFinite(value) && value >= 1 ? value : 1);
    }

    async function sendLocations() {
        if (locations.length < 2) {
            setMessage(
                "Select a warehouse and at least one customer location."
            );
            return;
        }

        setIsSending(true);
        setMessage("");

        try {
            const response = await fetch("/api/optimize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    locations,
                    deliveryPartners
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Fix 4: data.error may not exist on every error response;
                // fall back to a generic message instead of rendering
                // "undefined" to the user.
                setMessage(data?.error || "Failed to optimize route.");
                return;
            }

            // Fix 5: the original code only ever displayed
            // data.routes[0].route, so with more than one delivery partner
            // every route except the first was computed by the backend and
            // then silently discarded. We now keep and render all routes,
            // guarding against a missing/empty routes array.
            if (!Array.isArray(data.routes) || data.routes.length === 0) {
                setMessage("Backend returned no routes.");
                setOptimizedRoutes([]);
                return;
            }

            setMessage("Route optimized successfully!");

setOptimizedRoutes(
    data.routes.map((r) => r.roadCoordinates)
);

setOptimizedResults(data.routes);
        } catch (error) {
            console.error(error);
            setMessage("Could not connect to the backend.");
        } finally {
            setIsSending(false);
        }
    }

    function clearLocations() {
    setLocations([]);
    setOptimizedRoutes([]);
    setOptimizedResults([]);
    setMessage("");
}

    return (
        <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
            <h1>DeliverIQ</h1>

            <label htmlFor="delivery-partners">
                Number of Delivery Partners:
            </label>{" "}
            <input
                id="delivery-partners"
                type="number"
                min="1"
                value={deliveryPartners}
                onChange={handleDeliveryPartnersChange}
            />

            <p>
                Click on the map to select locations.
                The first location is the warehouse.
            </p>

            <MapContainer
                center={[21.1458, 79.0882]}
                zoom={12}
                style={{
                    height: "500px",
                    width: "100%"
                }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                <LocationSelector onLocationSelect={addLocation} />

                {locations.map((location, index) => (
                    <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={index === 0 ? warehouseIcon : customerIcon}
                    />
                ))}

                {optimizedRoutes.map((route, routeIndex) => (
                    <Polyline
                        key={routeIndex}
                        positions={route.map((location) => [
                            location.latitude,
                            location.longitude
                        ])}
                        pathOptions={{
                            color: ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]
                        }}
                    />
                ))}
            </MapContainer>

            <h2>Selected Locations</h2>

            {locations.length === 0 && <p>No locations selected yet.</p>}

            {locations.map((location, index) => (
                <p key={location.id}>
                    {index + 1}. {location.name}
                    {" — "}
                    {location.latitude.toFixed(5)},{" "}
                    {location.longitude.toFixed(5)}{" "}
                    <button onClick={() => removeLocation(location.id)}>
                        Remove
                    </button>
                </p>
            ))}

            <button onClick={sendLocations} disabled={isSending}>
                {isSending ? "Optimizing..." : "Send to Backend"}
            </button>{" "}
            <button onClick={clearLocations}>Clear Locations</button>

            {message && <p>{message}</p>}
            {optimizedResults.length > 0 && (
    <div
        style={{
            marginTop: "20px",
            padding: "20px",
            border: "1px solid #555",
            borderRadius: "10px",
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto"
        }}
    >
        <h2>Optimized Route</h2>

        {optimizedResults.map((result, routeIndex) => (
            <div key={routeIndex}>
                <h3>
                    Delivery Partner {result.partner}
                </h3>

                <p>
                    <strong>Total Distance:</strong>{" "}
                    {result.distance} km
                </p>

                <p>
                    <strong>Travel Time:</strong>{" "}
                    {result.travelTime} min
                </p>

                <h4>Stop Order</h4>

                {result.route.map((location, index) => (
                    <p key={index}>
                        {index + 1}.{" "}
                        {location.name}
                    </p>
                ))}
            </div>
        ))}
    </div>
)}
        </div>
    );
}

export default App;