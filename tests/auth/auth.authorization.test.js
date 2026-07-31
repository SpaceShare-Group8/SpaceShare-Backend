import request from "supertest";
import { describe, test, expect } from "@jest/globals";
import app from "../../src/app.js";

describe("Authorization Middleware", () => {
  test("GET /api/auth/me without token returns 401", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/auth/me with invalid token returns 401", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");

    expect(response.statusCode).toBe(401);
  });
});