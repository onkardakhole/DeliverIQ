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


const WAREHOUSE_COLORS = [
    "#2563eb",
    "#0d9488",
    "#f97316",
    "#9333ea",
    "#dc2626",
    "#0891b2"
];


function createWarehouseIcon(color) {
    return L.divIcon({
        className: "",
        html: `
            <div
                style="
                    font-size:30px;
                    border:3px solid ${color};
                    border-radius:50%;
                    width:40px;
                    height:40px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:white;
                    box-shadow:0 2px 6px rgba(0,0,0,0.3);
                "
            >
                🏭
            </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23]
    });
}


function createCustomerIcon(color) {
    return L.divIcon({
        className: "",
        html: `
            <div
                style="
                    font-size:24px;
                    width:32px;
                    height:32px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:${color}33;
                    border:2px solid ${color};
                    border-radius:50%;
                "
            >
                📍
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
}


function LocationSelector({ onLocationSelect }) {

    useMapEvents({
        click(event) {
            onLocationSelect(event.latlng);
        }
    });

    return null;
}


let nextLocationId = 1;


function App() {

    const [locations, setLocations] =
        useState([]);

    const [placementMode, setPlacementMode] =
        useState("warehouse");

    const [message, setMessage] =
        useState("");

    const [optimizedRoutes, setOptimizedRoutes] =
        useState([]);

    const [isSending, setIsSending] =
        useState(false);


    function addLocation(latlng) {

        const warehouseCount =
            locations.filter(
                (location) =>
                    location.type === "warehouse"
            ).length;


        const customerCount =
            locations.filter(
                (location) =>
                    location.type === "customer"
            ).length;


        if (placementMode === "warehouse") {

            const color =
                WAREHOUSE_COLORS[
                    warehouseCount %
                    WAREHOUSE_COLORS.length
                ];


            const newWarehouse = {
                id: nextLocationId++,
                type: "warehouse",
                name:
                    `Warehouse ${warehouseCount + 1}`,
                latitude: latlng.lat,
                longitude: latlng.lng,
                assignedWarehouseId: null,
                color
            };


            setLocations((prev) => [
                ...prev,
                newWarehouse
            ]);

        } else {

            const newCustomer = {
                id: nextLocationId++,
                type: "customer",
                name:
                    `Customer ${customerCount + 1}`,
                latitude: latlng.lat,
                longitude: latlng.lng,
                assignedWarehouseId: null
            };


            setLocations((prev) => [
                ...prev,
                newCustomer
            ]);
        }


        setOptimizedRoutes([]);
        setMessage("");
    }


    function removeLocation(id) {

        setLocations((prev) =>
            prev
                .filter(
                    (location) =>
                        location.id !== id
                )
                .map((location) => {

                    if (
                        location.type ===
                            "customer" &&
                        location.assignedWarehouseId ===
                            id
                    ) {
                        return {
                            ...location,
                            assignedWarehouseId:
                                null
                        };
                    }

                    return location;
                })
        );


        setOptimizedRoutes([]);
        setMessage("");
    }


    async function optimizeRoutes() {

        const warehouses =
            locations.filter(
                (location) =>
                    location.type ===
                    "warehouse"
            );


        const customers =
            locations.filter(
                (location) =>
                    location.type ===
                    "customer"
            );


        if (
            warehouses.length === 0 ||
            customers.length === 0
        ) {
            setMessage(
                "Add at least one warehouse and one customer."
            );

            return;
        }


        setIsSending(true);
        setMessage("");


        try {

            const response =
                await fetch(
                    "/api/optimize",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            locations,
                            deliveryPartners:
                                warehouses.length
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                setMessage(
                    data?.error ||
                    "Failed to optimize routes."
                );

                return;
            }


            if (
                !Array.isArray(
                    data.routes
                )
            ) {

                setMessage(
                    "Backend returned invalid routes."
                );

                return;
            }


            setLocations(
                data.locations
            );


            setOptimizedRoutes(
                data.routes
            );


            setMessage(
                "Routes optimized successfully!"
            );

        } catch (error) {

            console.error(error);

            setMessage(
                "Could not connect to the backend."
            );

        } finally {

            setIsSending(false);
        }
    }


    function getWarehouseById(id) {

        return locations.find(
            (location) =>
                location.id === id &&
                location.type ===
                    "warehouse"
        );
    }


    const warehouses =
        locations.filter(
            (location) =>
                location.type ===
                "warehouse"
        );


    const customers =
        locations.filter(
            (location) =>
                location.type ===
                "customer"
        );


    const unassignedCustomers =
        customers.filter(
            (customer) =>
                customer.assignedWarehouseId ===
                null
        );


    const totalDistance =
        optimizedRoutes.reduce(
            (total, route) =>
                total + route.distance,
            0
        );


    const totalTravelTime =
        optimizedRoutes.reduce(
            (total, route) =>
                total + route.travelTime,
            0
        );


    return (
        <div
            style={{
                fontFamily:
                    "Arial, sans-serif",
                height: "100vh",
                display: "flex",
                flexDirection:
                    "column",
                background:
                    "#f5f7fb"
            }}
        >

            {/* TOP BAR */}

            <header
                style={{
                    height: "65px",
                    background: "#ffffff",
                    borderBottom:
                        "1px solid #ddd",
                    display: "flex",
                    alignItems:
                        "center",
                    justifyContent:
                        "space-between",
                    padding:
                        "0 20px"
                }}
            >

                <div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize:
                                "24px"
                        }}
                    >
                        DeliverIQ
                    </h1>

                </div>


                <div
                    style={{
                        fontSize:
                            "14px",
                        color:
                            "#555"
                    }}
                >
                    {warehouses.length}
                    {" warehouses · "}
                    {customers.length}
                    {" customers"}
                </div>


                <button
                    onClick={
                        optimizeRoutes
                    }
                    disabled={
                        isSending ||
                        warehouses.length ===
                            0 ||
                        customers.length ===
                            0
                    }
                    style={{
                        padding:
                            "10px 18px",
                        border: "none",
                        borderRadius:
                            "6px",
                        background:
                            warehouses.length >
                                0 &&
                            customers.length >
                                0
                                ? "#2563eb"
                                : "#aaa",
                        color: "white",
                        fontWeight:
                            "bold",
                        cursor:
                            warehouses.length >
                                0 &&
                            customers.length >
                                0
                                ? "pointer"
                                : "not-allowed"
                    }}
                >
                    {isSending
                        ? "Optimizing..."
                        : "Optimize routes"}
                </button>

            </header>


            {/* MAIN DASHBOARD */}

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    minHeight: 0
                }}
            >

                {/* LEFT SIDEBAR */}

                <aside
                    style={{
                        width:
                            "220px",
                        background:
                            "#ffffff",
                        borderRight:
                            "1px solid #ddd",
                        padding:
                            "16px",
                        overflowY:
                            "auto"
                    }}
                >

                    <h3
                        style={{
                            marginTop: 0
                        }}
                    >
                        Placement Mode
                    </h3>


                    <button
                        onClick={() =>
                            setPlacementMode(
                                "warehouse"
                            )
                        }
                        style={{
                            width: "100%",
                            padding:
                                "10px",
                            marginBottom:
                                "8px",
                            borderRadius:
                                "6px",
                            border:
                                "1px solid #ccc",
                            background:
                                placementMode ===
                                "warehouse"
                                    ? "#e8f0ff"
                                    : "white",
                            cursor:
                                "pointer"
                        }}
                    >
                        🏭 Add warehouse
                    </button>


                    <button
                        onClick={() =>
                            setPlacementMode(
                                "customer"
                            )
                        }
                        style={{
                            width: "100%",
                            padding:
                                "10px",
                            borderRadius:
                                "6px",
                            border:
                                "1px solid #ccc",
                            background:
                                placementMode ===
                                "customer"
                                    ? "#e8f0ff"
                                    : "white",
                            cursor:
                                "pointer"
                        }}
                    >
                        📍 Add customer
                    </button>


                    <hr
                        style={{
                            margin:
                                "18px 0"
                        }}
                    />


                    <h3>
                        Locations
                    </h3>


                    {warehouses.map(
                        (warehouse) => {

                            const assignedCustomers =
                                customers.filter(
                                    (customer) =>
                                        customer.assignedWarehouseId ===
                                        warehouse.id
                                );


                            return (
                                <div
                                    key={
                                        warehouse.id
                                    }
                                    style={{
                                        marginBottom:
                                            "15px"
                                    }}
                                >

                                    {/* WAREHOUSE */}

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "space-between",
                                            fontWeight:
                                                "bold"
                                        }}
                                    >

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                alignItems:
                                                    "center",
                                                gap:
                                                    "7px"
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width:
                                                        "10px",
                                                    height:
                                                        "10px",
                                                    borderRadius:
                                                        "50%",
                                                    background:
                                                        warehouse.color,
                                                    display:
                                                        "inline-block"
                                                }}
                                            />

                                            {warehouse.name}

                                        </div>


                                        <button
                                            onClick={() =>
                                                removeLocation(
                                                    warehouse.id
                                                )
                                            }
                                            style={{
                                                border:
                                                    "none",
                                                background:
                                                    "transparent",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            ✕
                                        </button>

                                    </div>


                                    {/* CUSTOMERS */}

                                    {assignedCustomers.map(
                                        (
                                            customer
                                        ) => (
                                            <div
                                                key={
                                                    customer.id
                                                }
                                                style={{
                                                    marginLeft:
                                                        "18px",
                                                    marginTop:
                                                        "7px",
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    justifyContent:
                                                        "space-between",
                                                    fontSize:
                                                        "13px"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        gap:
                                                            "6px"
                                                    }}
                                                >

                                                    <span
                                                        style={{
                                                            width:
                                                                "7px",
                                                            height:
                                                                "7px",
                                                            borderRadius:
                                                                "50%",
                                                            background:
                                                                warehouse.color,
                                                            opacity:
                                                                0.5
                                                        }}
                                                    />

                                                    {customer.name}

                                                </div>


                                                <button
                                                    onClick={() =>
                                                        removeLocation(
                                                            customer.id
                                                        )
                                                    }
                                                    style={{
                                                        border:
                                                            "none",
                                                        background:
                                                            "transparent",
                                                        cursor:
                                                            "pointer"
                                                    }}
                                                >
                                                    ✕
                                                </button>

                                            </div>
                                        )
                                    )}

                                </div>
                            );
                        }
                    )}


                    {/* UNASSIGNED */}

                    {unassignedCustomers.length >
                        0 && (

                        <div>

                            <h4
                                style={{
                                    color:
                                        "#777"
                                }}
                            >
                                Unassigned
                            </h4>


                            {unassignedCustomers.map(
                                (
                                    customer
                                ) => (

                                    <div
                                        key={
                                            customer.id
                                        }
                                        style={{
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "space-between",
                                            marginBottom:
                                                "8px",
                                            fontSize:
                                                "13px"
                                        }}
                                    >

                                        <span>
                                            📍{" "}
                                            {
                                                customer.name
                                            }
                                        </span>


                                        <button
                                            onClick={() =>
                                                removeLocation(
                                                    customer.id
                                                )
                                            }
                                            style={{
                                                border:
                                                    "none",
                                                background:
                                                    "transparent",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            ✕
                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </aside>


                {/* MAP */}

                <main
                    style={{
                        flex: 1,
                        position:
                            "relative",
                        minWidth: 0
                    }}
                >

                    <MapContainer
                        center={[
                            21.1458,
                            79.0882
                        ]}
                        zoom={12}
                        style={{
                            height:
                                "100%",
                            width:
                                "100%"
                        }}
                    >

                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />


                        <LocationSelector
                            onLocationSelect={
                                addLocation
                            }
                        />


                        {/* MARKERS */}

                        {locations.map(
                            (
                                location
                            ) => {

                                let icon;


                                if (
                                    location.type ===
                                    "warehouse"
                                ) {

                                    icon =
                                        createWarehouseIcon(
                                            location.color
                                        );

                                } else {

                                    const warehouse =
                                        getWarehouseById(
                                            location.assignedWarehouseId
                                        );


                                    const color =
                                        warehouse
                                            ? warehouse.color
                                            : "#888888";


                                    icon =
                                        createCustomerIcon(
                                            color
                                        );
                                }


                                return (
                                    <Marker
                                        key={
                                            location.id
                                        }
                                        position={[
                                            location.latitude,
                                            location.longitude
                                        ]}
                                        icon={
                                            icon
                                        }
                                    />
                                );
                            }
                        )}


                        {/* ROUTES */}

                        {optimizedRoutes.map(
                            (
                                route
                            ) => (

                                <Polyline
                                    key={
                                        route.warehouseId
                                    }
                                    positions={
                                        route.roadCoordinates.map(
                                            (
                                                location
                                            ) => [
                                                location.latitude,
                                                location.longitude
                                            ]
                                        )
                                    }
                                    pathOptions={{
                                        color:
                                            route.color,
                                        weight:
                                            5
                                    }}
                                />

                            )
                        )}

                    </MapContainer>


                    {/* LEGEND */}

                    {optimizedRoutes.length >
                        0 && (

                        <div
                            style={{
                                position:
                                    "absolute",
                                bottom:
                                    "20px",
                                left:
                                    "20px",
                                background:
                                    "white",
                                padding:
                                    "10px 14px",
                                borderRadius:
                                    "8px",
                                boxShadow:
                                    "0 2px 8px rgba(0,0,0,0.25)",
                                zIndex:
                                    1000
                            }}
                        >

                            <strong>
                                Routes
                            </strong>


                            {optimizedRoutes.map(
                                (
                                    route
                                ) => (

                                    <div
                                        key={
                                            route.warehouseId
                                        }
                                        style={{
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            gap:
                                                "7px",
                                            marginTop:
                                                "6px",
                                            fontSize:
                                                "13px"
                                        }}
                                    >

                                        <span
                                            style={{
                                                width:
                                                    "12px",
                                                height:
                                                    "12px",
                                                borderRadius:
                                                    "50%",
                                                background:
                                                    route.color
                                            }}
                                        />

                                        {
                                            route.warehouseName
                                        }

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </main>


                {/* RIGHT SIDEBAR */}

                <aside
                    style={{
                        width:
                            "280px",
                        background:
                            "#ffffff",
                        borderLeft:
                            "1px solid #ddd",
                        padding:
                            "16px",
                        overflowY:
                            "auto"
                    }}
                >

                    <h2
                        style={{
                            marginTop: 0
                        }}
                    >
                        Route Summary
                    </h2>


                    {optimizedRoutes.length ===
                        0 && (

                        <p
                            style={{
                                color:
                                    "#777"
                            }}
                        >
                            Optimize routes to
                            see route summaries.
                        </p>

                    )}


                    {optimizedRoutes.map(
                        (
                            route
                        ) => (

                            <div
                                key={
                                    route.warehouseId
                                }
                                style={{
                                    border:
                                        "1px solid #ddd",
                                    borderLeft:
                                        `5px solid ${route.color}`,
                                    borderRadius:
                                        "8px",
                                    padding:
                                        "12px",
                                    marginBottom:
                                        "12px"
                                }}
                            >

                                <h3
                                    style={{
                                        marginTop:
                                            0
                                    }}
                                >
                                    {
                                        route.warehouseName
                                    }
                                </h3>


                                <p>
                                    <strong>
                                        Stops:
                                    </strong>{" "}
                                    {
                                        Math.max(
                                            route.stopOrder.length -
                                            2,
                                            0
                                        )
                                    }
                                </p>


                                <p>
                                    <strong>
                                        Time:
                                    </strong>{" "}
                                    {
                                        route.travelTime
                                    }{" "}
                                    min
                                </p>


                                <p>
                                    <strong>
                                        Distance:
                                    </strong>{" "}
                                    {
                                        route.distance
                                    }{" "}
                                    km
                                </p>


                                <details>

                                    <summary>
                                        Stop order
                                    </summary>


                                    <ol>
                                        {route.stopOrder.map(
                                            (
                                                location,
                                                index
                                            ) => (

                                                <li
                                                    key={
                                                        index
                                                    }
                                                >
                                                    {
                                                        location.name
                                                    }
                                                </li>

                                            )
                                        )}
                                    </ol>

                                </details>

                            </div>

                        )
                    )}


                    {optimizedRoutes.length >
                        0 && (

                        <div
                            style={{
                                borderTop:
                                    "1px solid #ddd",
                                paddingTop:
                                    "12px",
                                marginTop:
                                    "15px",
                                fontSize:
                                    "13px",
                                color:
                                    "#555"
                            }}
                        >

                            <strong>
                                Combined
                            </strong>

                            <p>
                                Total time:{" "}
                                {
                                    totalTravelTime
                                }{" "}
                                min
                            </p>

                            <p>
                                Total distance:{" "}
                                {
                                    totalDistance.toFixed(
                                        2
                                    )
                                }{" "}
                                km
                            </p>

                        </div>

                    )}

                </aside>

            </div>


            {/* MESSAGE */}

            {message && (

                <div
                    style={{
                        position:
                            "fixed",
                        bottom:
                            "15px",
                        left:
                            "50%",
                        transform:
                            "translateX(-50%)",
                        background:
                            "#ffffff",
                        padding:
                            "10px 18px",
                        borderRadius:
                            "6px",
                        boxShadow:
                            "0 2px 8px rgba(0,0,0,0.2)",
                        zIndex:
                            2000
                    }}
                >
                    {message}
                </div>

            )}

        </div>
    );
}


export default App;