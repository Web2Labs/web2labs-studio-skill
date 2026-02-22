import test from "node:test"
import assert from "node:assert/strict"
import { BrandTool } from "../src/tools/brand.mjs"

test("BrandTool get action returns current brand", async () => {
  const context = {
    apiClient: {
      async getBrand() {
        return { primaryColor: "#112233" }
      },
    },
  }

  const result = await BrandTool.execute(context, { action: "get" })
  assert.equal(result.action, "get")
  assert.equal(result.brand.primaryColor, "#112233")
})

test("BrandTool update action normalizes snake_case fields", async () => {
  const calls = []
  const context = {
    apiClient: {
      async updateBrand(payload) {
        calls.push(payload)
        return payload
      },
    },
  }

  const result = await BrandTool.execute(context, {
    action: "update",
    primary_color: "#1a73e8",
    secondary_color: "#ff6f00",
    channel_name: "Web2Labs",
  })

  assert.equal(result.action, "update")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].primaryColor, "#1a73e8")
  assert.equal(calls[0].secondaryColor, "#ff6f00")
  assert.equal(calls[0].channelName, "Web2Labs")
  assert.ok(result.updatedFields.includes("primaryColor"))
})

test("BrandTool update requires at least one field", async () => {
  const context = {
    apiClient: {
      async updateBrand(payload) {
        return payload
      },
    },
  }

  await assert.rejects(
    () => BrandTool.execute(context, { action: "update", updates: {} }),
    /No brand fields were provided/i
  )
})
