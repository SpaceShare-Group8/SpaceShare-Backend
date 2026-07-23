import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";

dotenv.config();

const app = express();

app.use("/api/auth", authRoutes);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the SpaceShare API!");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Spaceshare API is running!",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log (`Server is running on port ${PORT}`);
}); 
