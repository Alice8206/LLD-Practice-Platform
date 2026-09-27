import Submission from "../models/Submission.js";
import Problem from "../models/Problem.js";
import { CompositeEvaluator } from "./CompositeEvaluator.js";

/**
 * evaluationQueue
 *
 * Deliberately NOT a distributed message broker (SQS/Kafka/BullMQ+Redis) —
 * the assignment explicitly asks to keep this practical. This is a single
 * in-process async queue: submissions are pushed onto an array and drained
 * one at a time by a worker loop. That's enough to demonstrate the pattern
 * (pending -> processing -> completed/failed, with retries) for a 2-day
 * prototype and a small number of concurrent users.
 *
 * How this would evolve for real scale (documented, not built): swap this
 * module's `enqueue`/worker loop for a real queue (e.g. BullMQ on Redis, or
 * SQS) and run N worker processes instead of N in-process async loops.
 * Nothing in routes/controllers would need to change, because they only
 * depend on `enqueue(submissionId)` and the Submission's status field —
 * that's the seam that makes this swappable later.
 */
const queue = [];
let draining = false;

const MAX_RETRIES = Number(process.env.EVAL_MAX_RETRIES) || 2;
const evaluator = new CompositeEvaluator();

export function enqueue(submissionId) {
  queue.push(submissionId);
  drain();
}

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const submissionId = queue.shift();
    await processSubmission(submissionId);
  }
  draining = false;
}

async function processSubmission(submissionId) {
  const submission = await Submission.findById(submissionId);
  if (!submission) return;

  submission.evaluationStatus = "processing";
  await submission.save();

  try {
    const problem = await Problem.findById(submission.problemId);
    if (!problem) throw new Error("Problem not found for submission");

    await evaluator.run(problem, submission);

    submission.evaluationStatus = "completed";
    submission.error = null;
    await submission.save();
  } catch (err) {
    submission.retryCount += 1;
    if (submission.retryCount <= MAX_RETRIES) {
      submission.evaluationStatus = "pending";
      submission.error = `Retry ${submission.retryCount}/${MAX_RETRIES}: ${err.message}`;
      await submission.save();
      queue.push(submissionId); // requeue for another attempt
    } else {
      submission.evaluationStatus = "failed";
      submission.error = err.message;
      await submission.save();
    }
  }
}

export default { enqueue };
