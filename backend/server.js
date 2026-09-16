const express = require("express");
const cors = require("cors");
const { optimizeRoute } = require("./services/routeOptimizer");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        project: "DeliverIQ",
        status: "Backend is running"
    });
});

app.post("/api/optimize", async (req, res) => {
    const {
        locations,
        deliveryPartners
    } = req.body;

    if (!Array.isArray(locations)) {
        return res.status(400).json({
            error: "Locations must be an array."
        });
    }

    if (locations.length < 2) {
        return res.status(400).json({
            error: "Select a warehouse and at least one customer."
        });
    }

    if (
        !Number.isInteger(deliveryPartners) ||
        deliveryPartners < 1
    ) {
        return res.status(400).json({
            error: "Invalid number of delivery partners."
        });
    }

    if (deliveryPartners !== 1) {
        return res.status(400).json({
            error: "Phase 1 supports only one delivery partner."
        });
    }

    for (const location of locations) {
        if (
            typeof location.latitude !== "number" ||
            typeof location.longitude !== "number"
        ) {
            return res.status(400).json({
                error: "Invalid location coordinates."
            });
        }
    }

    const result = await optimizeRoute(locations);

    res.json({
        success: true,
        deliveryPartners: 1,
        routes: [
            {
                partner: 1,
                route: result.route,
                travelTime: result.travelTime,
                distance: result.distance,
                roadCoordinates: result.roadCoordinates
            }
        ]
    });
});

app.listen(3000, () => {
    console.log(
        "DeliverIQ backend running on http://localhost:3000"
    );
});