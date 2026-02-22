import test from "node:test"
import assert from "node:assert/strict"
import { StudioApiClient, StudioApiError } from "../src/lib/api-client.mjs"

test("StudioApiClient requires authentication", () => {
  const client = new StudioApiClient({ apiEndpoint: "https://example.com" })
  assert.throws(() => client.getAuthHeaders(), StudioApiError)
})

test("StudioApiClient prefers API key auth", () => {
  const client = new StudioApiClient({
    apiEndpoint: "https://example.com",
    apiKey: "w2l_test",
    bearerToken: "abc",
  })

  const headers = client.getAuthHeaders()
  assert.equal(headers["X-API-Key"], "w2l_test")
  assert.equal(headers.Authorization, undefined)
})

test("StudioApiClient resolves v1 paths", () => {
  const client = new StudioApiClient({ apiEndpoint: "https://example.com" })
  assert.equal(client.resolveUrl("/credits"), "https://example.com/api/v1/credits")
  assert.equal(client.resolveUrl("/api/v1/credits"), "https://example.com/api/v1/credits")
})

test("StudioApiClient revenue/brand/assets endpoints use expected paths", async () => {
  const client = new StudioApiClient({
    apiEndpoint: "https://example.com",
    apiKey: "w2l_test",
  })

  const calls = []
  client.request = async (method, path, options = {}) => {
    calls.push({ method, path, options })
    return { ok: true }
  }

  await client.getPricing()
  await client.estimateCost({ durationMinutes: 10 })
  await client.getAnalytics("this_month")
  await client.getBrand()
  await client.updateBrand({ primaryColor: "#112233" })
  await client.importBrand({ url: "https://youtube.com/@web2labs", apply: false })
  await client.listAssets()
  await client.deleteAsset("intro")
  await client.generateProjectThumbnails("project-1", { variants: 2 })
  await client.rerenderProject("project-1", { subtitlesOnVideo: true })

  assert.equal(calls[0].method, "GET")
  assert.equal(calls[0].path, "/pricing")
  assert.equal(calls[1].method, "POST")
  assert.equal(calls[1].path, "/estimate")
  assert.equal(calls[2].method, "GET")
  assert.equal(calls[2].path, "/analytics?period=this_month")
  assert.equal(calls[3].method, "GET")
  assert.equal(calls[3].path, "/brand")
  assert.equal(calls[4].method, "PUT")
  assert.equal(calls[4].path, "/brand")
  assert.equal(calls[5].method, "POST")
  assert.equal(calls[5].path, "/brand/import")
  assert.equal(calls[6].method, "GET")
  assert.equal(calls[6].path, "/assets")
  assert.equal(calls[7].method, "DELETE")
  assert.equal(calls[7].path, "/assets/intro")
  assert.equal(calls[8].method, "POST")
  assert.equal(calls[8].path, "/projects/project-1/thumbnails/generate")
  assert.equal(calls[9].method, "POST")
  assert.equal(calls[9].path, "/projects/project-1/rerender")
})

test("StudioApiClient uploadAsset rejects invalid type", async () => {
  const client = new StudioApiClient({
    apiEndpoint: "https://example.com",
    apiKey: "w2l_test",
  })

  await assert.rejects(
    () => client.uploadAsset("bad-type", "/tmp/file.mp4"),
    /assetType must be one of/i
  )
})
