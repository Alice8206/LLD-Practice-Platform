import "dotenv/config";
import { createApp } from "./src/app.js";
import { connectDB } from "./src/config/db.js";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lld_practice";

async function main() {
  await connectDB(MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
