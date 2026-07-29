import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 SpaceShare API running on http://localhost:${PORT}`);
});

/* Handle unhandled promise rejections */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);

  server.close(() => process.exit(1));
});