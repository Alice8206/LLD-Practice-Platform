import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app.js";
import Problem from "../models/Problem.js";

let mongod;
let app;
let problem;

async function waitForCompletion(submissionId, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app).get(`/api/submissions/${submissionId}`);
    if (res.body.submission.evaluationStatus === "completed" || res.body.submission.evaluationStatus === "failed") {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for evaluation to complete");
}

beforeAll(async () => {
  // Ensure no real Gemini key leaks in from the environment during tests —
  // we want the deterministic stub path so tests don't depend on network.
  delete process.env.GEMINI_API_KEY;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();

  problem = await Problem.create({
    slug: "test-problem",
    title: "Test Problem",
    summary: "A problem for testing.",
    requirements: ["Do the thing."],
    constraints: [],
    expectedConcepts: { entities: ["Thing"], relationships: [], patterns: [] },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe("Practice loop: problem -> attempt -> submit -> feedback -> history", () => {
  test("full happy path produces a completed submission with feedback", async () => {
    const attemptRes = await request(app)
      .post("/api/attempts")
      .send({ problemId: problem._id.toString(), learnerId: "learner-1" });
    expect(attemptRes.status).toBe(201);
    const attempt = attemptRes.body;
    expect(attempt.attemptNumber).toBe(1);

    const draftRes = await request(app)
      .put(`/api/attempts/${attempt._id}`)
      .send({ explanation: "The Thing does things.", diagram: "classDiagram\nclass Thing" });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.content.explanation).toContain("Thing");

    const submitRes = await request(app).post("/api/submissions").send({ attemptId: attempt._id });
    expect(submitRes.status).toBe(202);
    expect(submitRes.body.evaluationStatus).toBe("pending");

    const result = await waitForCompletion(submitRes.body._id);
    expect(result.submission.evaluationStatus).toBe("completed");
    expect(result.feedback).toBeTruthy();
    expect(result.feedback.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.feedback.deterministic.diagramPresent).toBe(true);

    const historyRes = await request(app)
      .get("/api/attempts")
      .query({ problemId: problem._id.toString(), learnerId: "learner-1" });
    expect(historyRes.body.length).toBe(1);
    expect(historyRes.body[0].status).toBe("submitted");
  });

  test("a second attempt on the same problem increments attemptNumber (try again)", async () => {
    const res = await request(app)
      .post("/api/attempts")
      .send({ problemId: problem._id.toString(), learnerId: "learner-1" });
    expect(res.body.attemptNumber).toBe(2);
  });

  describe("edge cases / failure handling", () => {
    test("rejects submitting an empty attempt", async () => {
      const attemptRes = await request(app)
        .post("/api/attempts")
        .send({ problemId: problem._id.toString(), learnerId: "learner-2" });

      const submitRes = await request(app).post("/api/submissions").send({ attemptId: attemptRes.body._id });
      expect(submitRes.status).toBe(400);
    });

    test("rejects submitting the same attempt twice", async () => {
      const attemptRes = await request(app)
        .post("/api/attempts")
        .send({ problemId: problem._id.toString(), learnerId: "learner-3" });
      await request(app).put(`/api/attempts/${attemptRes.body._id}`).send({ explanation: "something" });

      const first = await request(app).post("/api/submissions").send({ attemptId: attemptRes.body._id });
      expect(first.status).toBe(202);

      const second = await request(app).post("/api/submissions").send({ attemptId: attemptRes.body._id });
      expect(second.status).toBe(409);
    });

    test("rejects editing a draft after it has been submitted", async () => {
      const attemptRes = await request(app)
        .post("/api/attempts")
        .send({ problemId: problem._id.toString(), learnerId: "learner-4" });
      await request(app).put(`/api/attempts/${attemptRes.body._id}`).send({ explanation: "something" });
      await request(app).post("/api/submissions").send({ attemptId: attemptRes.body._id });

      const editRes = await request(app).put(`/api/attempts/${attemptRes.body._id}`).send({ explanation: "changed my mind" });
      expect(editRes.status).toBe(409);
    });

    test("returns 404 for a submission that does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/submissions/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });
});
