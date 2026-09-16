<div align="center">

# 🚚 DeliverIQ

### A delivery route optimizer that actually understands roads.

*Not a map with pins on it. A working answer to a real NP-hard problem.*

![status](https://img.shields.io/badge/status-active--development-blue)
![stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20OSRM-black)


</div>

---

## The problem, stated properly

You have a warehouse. You have a list of customers who need deliveries today.
In what order should the driver visit them?

The naive answer — "closest one first" — is wrong more often than it's right,
because *closest in a straight line* and *closest by road* are two different
things. A river, a one-way street, or a highway on-ramp can make a customer
that's 400 meters away take longer to reach than one that's 2 kilometers away.

This is the **Travelling Salesman Problem**, except the "distance" you're
optimizing for isn't distance at all — it's real, asymmetric, road-network
travel time. That distinction is the entire reason this project exists.

## What it does, concretely

```
You click a warehouse and a handful of customers on a map
                        │
        Backend asks OSRM: "what's the real travel time
             between every pair of these points?"
                        │
     A TSP solver chews through that matrix and finds the
        visiting order that minimizes total drive time
                        │
      OSRM is asked again — this time for the actual road
          geometry of that specific optimized route
                        │
   You get a route drawn on real streets, with a stop order,
              total distance, and total time
```

No API keys. No paid map tiles. No Haversine-formula shortcuts pretending to
be real routing.

## Why it's built the way it is

| Decision | Reasoning |
|---|---|
| **Leaflet over Google Maps** | Free, no billing account, no API key — this stays a project you can clone and run, not one you have to pay to demo. |
| **OSRM over straight-line distance** | Straight-line distance doesn't know about one-way streets or rivers. Roads do. |
| **Brute-force TSP (for now)** | For a handful of stops, exact optimization is cheap and *correct*. Approximation algorithms are a next step, not a first one. |
| **Two separate OSRM calls** | One call gets you *numbers* (the time matrix, for deciding order). A second gets you *geometry* (the actual polyline, for drawing it). Conflating these is a common rookie mistake in routing projects. |

## Architecture

```
┌────────────────────┐
│   React Frontend   │   click-to-place map · live state · result panel
└──────────┬─────────┘
           │ POST /api/optimize
┌──────────▼─────────┐
│  Express Backend   │   receives locations, orchestrates the pipeline
└──────────┬─────────┘
           │
┌──────────▼─────────┐
│        OSRM        │   travel-time matrix  →  TSP solver  →  road geometry
└──────────┬─────────┘
           │ optimized route + geometry
┌──────────▼─────────┐
│   Back to React    │   polyline drawn on real roads + summary cards
└────────────────────┘
```

## Status: what's real vs. what's planned

Most READMEs bury this. It shouldn't be buried — it's the most useful thing
to know before you read the code.

**✅ Working right now**
- Click-to-place warehouse and customer markers
- Real OSRM travel-time matrix (not straight-line)
- Exact TSP optimization via permutation search
- Real road geometry rendered on the map
- Distance / time / stop-order results panel

**🔧 In active development**
- **Multiple warehouses.** Reframing this from single-depot TSP into a proper
  Multi-Depot VRP: customers get assigned to their nearest warehouse by
  *travel time*, then each warehouse runs its own independent optimized route,
  color-coded on the same map.

**🔜 Planned**
- Multiple delivery partners per warehouse, via K-Means clustering
- Capacity-aware assignment (so one warehouse doesn't get overloaded)
- Time-window constraints per customer (VRPTW)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React-Leaflet |
| Map data | OpenStreetMap |
| Backend | Node.js, Express |
| Routing engine | OSRM (Table + Route services) |
| Optimization | Custom TSP (permutation search) |

## Running it locally

```bash
# clone and install
git clone https://github.com/<your-username>/deliveriq.git
cd deliveriq

# backend
cd server && npm install && npm start

# frontend
cd ../client && npm install && npm start
```

By default this points at OSRM's public demo server. For anything beyond a
demo, run your own OSRM instance — the public one is rate-limited and not
meant for production traffic.

## Known limitations (said out loud, on purpose)

- Brute-force TSP is exact but factorial — fine for a handful of stops, not
  fine for fifty. Clustering is the planned fix, not a hidden flaw.
- Nearest-by-travel-time warehouse assignment doesn't balance load across
  warehouses. A warehouse near a dense customer cluster will get more stops
  than one that isn't — there's no capacity cap yet.
- No persistence layer. Refresh the page, lose your session. This is a
  routing engine first, a product second — for now.

## Why this isn't "just another maps project"

Most student projects that touch maps stop at "put a marker where I click."
This one asks the harder question underneath that: given real roads, real
asymmetric travel times, and a hard combinatorial optimization problem, what
route is actually best — and can you prove it's optimal, not just plausible?

That's the part worth looking at.

---

<div align="center">

*Built as part of an academic delivery-logistics project .*

</div>
