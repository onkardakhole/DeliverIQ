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

function findBestRoute(locations, travelTimes) {
    const warehouse = locations[0];
    const customers = locations.slice(1);

    let bestRoute = null;
    let shortestTime = Infinity;

    function generateRoutes(currentRoute, remaining, currentTime) {
        if (remaining.length === 0) {
            const lastLocation =
                currentRoute.length === 0
                    ? warehouse
                    : currentRoute[currentRoute.length - 1];

            const lastIndex = locations.indexOf(lastLocation);
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
                : currentRoute[currentRoute.length - 1];

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
        travelTime: Math.round(shortestTime / 60)
    };
}

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
        throw new Error("Invalid route response from OSRM.");
    }

    return data.routes[0];
}

async function optimizeRoute(locations) {
    const travelTimes =
        await getTravelTimeMatrix(locations);

    const result =
        findBestRoute(
            locations,
            travelTimes
        );

    const roadRoute =
        await getRouteGeometry(result.route);

    const roadCoordinates =
        roadRoute.geometry.coordinates.map(
            ([longitude, latitude]) => ({
                latitude,
                longitude
            })
        );

    return {
        route: result.route,
        travelTime: result.travelTime,
        roadCoordinates,
        distance: Number(
            (roadRoute.distance / 1000).toFixed(2)
        )
    };
}

module.exports = {
    optimizeRoute
};