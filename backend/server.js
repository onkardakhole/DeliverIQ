const express = require("express");
const cors = require("cors");

const {
    optimizeRoutes
} = require("./services/routeOptimizer");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.json({
        project: "DeliverIQ",
        status: "Backend is running"
    });
});


app.post(
    "/api/optimize",
    async (req, res) => {

        const {
            locations,
            deliveryPartners
        } = req.body;


        if (!Array.isArray(locations)) {
            return res.status(400).json({
                error:
                    "Locations must be an array."
            });
        }


        if (locations.length < 2) {
            return res.status(400).json({
                error:
                    "Add at least one warehouse and one customer."
            });
        }


        if (
            !Number.isInteger(
                deliveryPartners
            ) ||
            deliveryPartners < 1
        ) {
            return res.status(400).json({
                error:
                    "Invalid number of delivery partners."
            });
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


        if (warehouses.length === 0) {
            return res.status(400).json({
                error:
                    "At least one warehouse is required."
            });
        }


        if (customers.length === 0) {
            return res.status(400).json({
                error:
                    "At least one customer is required."
            });
        }


        for (
            const location of locations
        ) {

            if (
                typeof location.latitude !==
                "number" ||
                typeof location.longitude !==
                "number"
            ) {
                return res.status(400).json({
                    error:
                        "Invalid location coordinates."
                });
            }


            if (
                location.type !==
                "warehouse" &&
                location.type !==
                "customer"
            ) {
                return res.status(400).json({
                    error:
                        "Location type must be warehouse or customer."
                });
            }
        }


        try {

            const result =
                await optimizeRoutes(
                    locations
                );


            res.json({
                success: true,
                deliveryPartners,
                locations:
                    result.locations,
                routes:
                    result.routes
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    error.message ||
                    "Route optimization failed."
            });
        }
    }
);


app.listen(
    3000,
    () => {
        console.log(
            "DeliverIQ backend running on http://localhost:3000"
        );
    }
);