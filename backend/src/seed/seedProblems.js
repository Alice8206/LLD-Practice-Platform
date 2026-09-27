import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Problem from "../models/Problem.js";

const problems = [
  {
    slug: "parking-lot",
    title: "Design a Parking Lot",
    difficulty: "medium",
    tags: ["OOP", "Strategy", "Factory"],
    summary:
      "Design the core classes for a multi-level parking lot that supports multiple vehicle types and spot sizes.",
    requirements: [
      "Support multiple vehicle types (motorcycle, car, bus) with different spot-size needs.",
      "Assign the nearest available suitable spot when a vehicle enters.",
      "Issue a ticket on entry and compute a fee on exit.",
      "Support multiple floors/levels.",
    ],
    constraints: ["Should be easy to add a new vehicle type without rewriting spot-assignment logic."],
    expectedConcepts: {
      entities: ["ParkingLot", "ParkingFloor", "ParkingSpot", "Vehicle", "Ticket"],
      relationships: ["ParkingLot has-many ParkingFloor", "ParkingFloor has-many ParkingSpot"],
      patterns: ["Strategy", "Factory"],
    },
  },
  {
    slug: "elevator-system",
    title: "Design an Elevator System",
    difficulty: "hard",
    tags: ["State", "Scheduling"],
    summary: "Design a system that controls multiple elevators in a building, handling scheduling and state.",
    requirements: [
      "Handle external hall calls (up/down) and internal cabin requests.",
      "Choose which elevator responds to a request.",
      "Model each elevator's state (idle, moving up, moving down, door open).",
      "Support multiple elevators serving the same set of floors.",
    ],
    constraints: ["Scheduling strategy should be replaceable (e.g. nearest-elevator vs. zone-based) without rewriting the elevator itself."],
    expectedConcepts: {
      entities: ["ElevatorController", "Elevator", "Request", "Floor"],
      relationships: ["ElevatorController has-many Elevator"],
      patterns: ["State", "Strategy", "Observer"],
    },
  },
  {
    slug: "vending-machine",
    title: "Design a Vending Machine",
    difficulty: "easy",
    tags: ["State", "Inventory"],
    summary: "Design a vending machine that accepts payment, tracks inventory, and dispenses items.",
    requirements: [
      "Support selecting an item and paying (cash or card).",
      "Track inventory per item slot and prevent selling out-of-stock items.",
      "Handle exact vs. insufficient payment, and dispense change.",
      "Model the machine's states clearly (idle, item selected, payment in progress, dispensing).",
    ],
    constraints: ["Should be easy to add a new payment method later."],
    expectedConcepts: {
      entities: ["VendingMachine", "Inventory", "Item", "Payment"],
      relationships: ["VendingMachine has-one Inventory"],
      patterns: ["State", "Strategy"],
    },
  },
  {
    slug: "rate-limiter",
    title: "Design a Rate Limiter",
    difficulty: "medium",
    tags: ["Algorithms", "Extensibility"],
    summary: "Design an in-process rate limiter that can be applied per user/API key with a pluggable algorithm.",
    requirements: [
      "Limit requests per client identifier within a time window.",
      "Support at least one concrete algorithm (e.g. token bucket or sliding window).",
      "Make the algorithm swappable without changing calling code.",
      "Return whether a request is allowed and, if not, when the client can retry.",
    ],
    constraints: ["Should not require an external service for the core design (a distributed store is an optional extension)."],
    expectedConcepts: {
      entities: ["RateLimiter", "RateLimitPolicy", "Client"],
      relationships: ["RateLimiter has-one RateLimitPolicy"],
      patterns: ["Strategy"],
    },
  },
];

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Create backend/.env from backend/.env.example and add a valid MongoDB connection string."
    );
  }

  await connectDB(mongoUri);
  for (const p of problems) {
    await Problem.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`[seed] upserted ${p.slug}`);
  }
  await disconnectDB();
  console.log("[seed] done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
