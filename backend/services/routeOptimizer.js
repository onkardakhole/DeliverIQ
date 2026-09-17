const WAREHOUSE_COLORS = [
    "#2563eb",
    "#0d9488",
    "#f97316",
    "#9333ea",
    "#dc2626",
    "#0891b2"
];

async function getTravelTimeMatrix(locations) {
    const coordinates = locations
        .map(
            (location) =>
                `${location.longitude},${location.latitude}`
        )
        .join(";");

    const url =
        `https://router.project-osrm.org/table/v1/driving/${coordinates}` +
        `?annotations=duration`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("OSRM travel-time request failed.");
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.durations) {
        throw new Error("Invalid response from OSRM.");
    }

    return data.durations;
}


/*
    STEP A
    Assign every customer to the warehouse that can
    reach it in the lowest travel time.
*/
function assignCustomersToWarehouses(
    locations,
    travelTimes
) {
    const warehouses = locations.filter(
        (location) => location.type === "warehouse"
    );

    const customers = locations.filter(
        (location) => location.type === "customer"
    );

    const assignedLocations = locations.map(
        (location) => ({
            ...location,
            assignedWarehouseId:
                location.type === "customer"
                    ? null
                    : null
        })
    );

    for (const customer of customers) {
        const customerIndex =
            locations.findIndex(
                (location) =>
                    location.id === customer.id
            );

        let nearestWarehouse = null;
        let shortestTime = Infinity;

        for (const warehouse of warehouses) {
            const warehouseIndex =
                locations.findIndex(
                    (location) =>
                        location.id === warehouse.id
                );

            const travelTime =
                travelTimes[warehouseIndex][customerIndex];

            if (travelTime < shortestTime) {
                shortestTime = travelTime;
                nearestWarehouse = warehouse;
            }
        }

        const customerLocation =
            assignedLocations.find(
                (location) =>
                    location.id === customer.id
            );

        customerLocation.assignedWarehouseId =
            nearestWarehouse.id;
    }

    return assignedLocations;
}


/*
    EXISTING SINGLE-WAREHOUSE TSP ALGORITHM

    This algorithm itself has not been changed.
    It is now called separately for every warehouse group.
*/
function findBestRoute(
    locations,
    travelTimes
) {
    const warehouse = locations[0];
    const customers = locations.slice(1);

    let bestRoute = null;
    let shortestTime = Infinity;

    function generateRoutes(
        currentRoute,
        remaining,
        currentTime
    ) {
        if (remaining.length === 0) {
            const lastLocation =
                currentRoute.length === 0
                    ? warehouse
                    : currentRoute[
                    currentRoute.length - 1
                    ];

            const lastIndex =
                locations.indexOf(lastLocation);

            const warehouseIndex = 0;

            const returnTime =
                travelTimes[lastIndex][warehouseIndex];

            const totalTime =
                currentTime + returnTime;

            if (totalTime < shortestTime) {
                shortestTime = totalTime;

                bestRoute = [
                    warehouse,
                    ...currentRoute,
                    warehouse
                ];
            }

            return;
        }

        const currentLocation =
            currentRoute.length === 0
                ? warehouse
                : currentRoute[
                currentRoute.length - 1
                ];

        const currentIndex =
            locations.indexOf(currentLocation);

        for (let i = 0; i < remaining.length; i++) {
            const next = remaining[i];

            const nextIndex =
                locations.indexOf(next);

            const travelTime =
                travelTimes[currentIndex][nextIndex];

            generateRoutes(
                [...currentRoute, next],
                remaining.filter(
                    (_, index) => index !== i
                ),
                currentTime + travelTime
            );
        }
    }

    generateRoutes([], customers, 0);

    return {
        route: bestRoute,
        travelTime: Math.round(
            shortestTime / 60
        )
    };
}


/*
    STEP C
    Get actual road geometry for one optimized route.
*/
async function getRouteGeometry(route) {
    const coordinates = route
        .map(
            (location) =>
                `${location.longitude},${location.latitude}`
        )
        .join(";");

    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
        `?overview=full&geometries=geojson`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("OSRM route request failed.");
    }

    const data = await response.json();

    if (
        data.code !== "Ok" ||
        !data.routes ||
        data.routes.length === 0
    ) {
        throw new Error(
            "Invalid route response from OSRM."
        );
    }

    return data.routes[0];
}


/*
    MAIN MDVRP OPTIMIZATION

    Multi-depot problem is reduced into
    independent single-depot TSP problems.
*/
async function optimizeRoutes(locations) {

    const warehouses = locations.filter(
        (location) =>
            location.type === "warehouse"
    );

    const customers = locations.filter(
        (location) =>
            location.type === "customer"
    );

    if (warehouses.length === 0) {
        throw new Error(
            "At least one warehouse is required."
        );
    }

    if (customers.length === 0) {
        throw new Error(
            "At least one customer is required."
        );
    }

    /*
        Build ONE matrix containing
        warehouses + customers.
    */
    const travelTimes =
        await getTravelTimeMatrix(
            locations
        );


    /*
        STEP A — Assignment
    */
    const assignedLocations =
        assignCustomersToWarehouses(
            locations,
            travelTimes
        );


    const routes = [];


    /*
        STEP B — TSP for every warehouse
    */
    for (
        let warehouseIndex = 0;
        warehouseIndex < warehouses.length;
        warehouseIndex++
    ) {

        const warehouse =
            warehouses[warehouseIndex];

        const warehouseCustomers =
            assignedLocations.filter(
                (location) =>
                    location.type === "customer" &&
                    location.assignedWarehouseId ===
                    warehouse.id
            );


        /*
            A warehouse may receive zero customers.
            In that case it still gets a route
            containing only the warehouse.
        */
        if (warehouseCustomers.length === 0) {

            routes.push({
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                color:
                    warehouse.color ||
                    WAREHOUSE_COLORS[
                    warehouseIndex %
                    WAREHOUSE_COLORS.length
                    ],
                stopOrder: [
                    warehouse,
                    warehouse
                ],
                travelTime: 0,
                distance: 0,
                roadCoordinates: [
                    {
                        latitude:
                            warehouse.latitude,
                        longitude:
                            warehouse.longitude
                    }
                ],
                assignedCustomers: []
            });

            continue;
        }


        const warehouseGroup = [
            warehouse,
            ...warehouseCustomers
        ];


        /*
            Create the travel-time matrix
            for this warehouse group.

            The original TSP algorithm expects
            indexes from its own locations array.
        */
        const groupTravelTimes =
            warehouseGroup.map(
                (fromLocation) => {

                    const fromIndex =
                        locations.findIndex(
                            (location) =>
                                location.id ===
                                fromLocation.id
                        );

                    return warehouseGroup.map(
                        (toLocation) => {

                            const toIndex =
                                locations.findIndex(
                                    (location) =>
                                        location.id ===
                                        toLocation.id
                                );

                            return travelTimes[
                                fromIndex
                            ][toIndex];
                        }
                    );
                }
            );


        const tspResult =
            findBestRoute(
                warehouseGroup,
                groupTravelTimes
            );


        /*
            STEP C — Actual road geometry
        */
        const roadRoute =
            await getRouteGeometry(
                tspResult.route
            );


        const roadCoordinates =
            roadRoute.geometry.coordinates.map(
                ([longitude, latitude]) => ({
                    latitude,
                    longitude
                })
            );


        routes.push({
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            color:
                warehouse.color ||
                WAREHOUSE_COLORS[
                warehouseIndex %
                WAREHOUSE_COLORS.length
                ],
            stopOrder:
                tspResult.route,
            travelTime:
                tspResult.travelTime,
            distance:
                Number(
                    (
                        roadRoute.distance /
                        1000
                    ).toFixed(2)
                ),
            roadCoordinates,
            assignedCustomers:
                warehouseCustomers
        });
    }


    return {
        locations: assignedLocations,
        routes
    };
}


module.exports = {
    optimizeRoutes
};