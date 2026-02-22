import test from "node:test"
import assert from "node:assert/strict"
import { ProjectPoller } from "../src/lib/poller.mjs"

test("ProjectPoller terminal detection", () => {
  assert.equal(ProjectPoller.isTerminalStatus("completed"), true)
  assert.equal(ProjectPoller.isTerminalStatus("failed"), true)
  assert.equal(ProjectPoller.isTerminalStatus("editing"), false)
})

test("ProjectPoller interval mapping", () => {
  assert.equal(ProjectPoller.getIntervalForStatus("Editing"), 10000)
  assert.equal(ProjectPoller.getIntervalForStatus("Uploading"), 3000)
})

test("PollTool timeout normalization clamps bounds", async () => {
  const { PollTool } = await import("../src/tools/poll.mjs")
  assert.equal(PollTool.normalizeTimeoutMinutes(undefined), 30)
  assert.equal(PollTool.normalizeTimeoutMinutes(0), 1)
  assert.equal(PollTool.normalizeTimeoutMinutes(999), 180)
  assert.equal(PollTool.normalizeTimeoutMinutes(15), 15)
})
