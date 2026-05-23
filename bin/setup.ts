import { run } from "../src/cli/index.js";

run().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
