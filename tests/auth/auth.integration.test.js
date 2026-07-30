import request from "supertest";
import { describe, test, expect } from "@jest/globals";
import app from "../../src/app.js";

describe("Authentication API", () => {
  test("Health endpoint should return 200", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe(true);
  });

  test("Register validation should reject empty payload", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test("Login validation should reject empty payload", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test("Forgot password validation should reject empty email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(response.statusCode).toBe(400);
  });

  test("Reset password validation should reject missing fields", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({});

    expect(response.statusCode).toBe(400);
  });
});