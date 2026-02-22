import test from "node:test"
import assert from "node:assert/strict"
import { RerenderTool } from "../src/tools/rerender.mjs"

class FakeApiClient {
  constructor() {
    this.lastProjectId = null
    this.lastConfiguration = null
  }

  async rerenderProject(projectId, configuration) {
    this.lastProjectId = projectId
    this.lastConfiguration = configuration
    return {
      projectId,
      status: "Rendering",
      creditsConsumed: { apiCredits: 0, creatorCredits: 0 },
    }
  }
}

test("RerenderTool requires project_id", async () => {
  const apiClient = new FakeApiClient()
  await assert.rejects(
    RerenderTool.execute({ apiClient }, { configuration: {} }),
    /project_id is required/i
  )
})

test("RerenderTool requires configuration object", async () => {
  const apiClient = new FakeApiClient()
  await assert.rejects(
    RerenderTool.execute(
      { apiClient },
      { project_id: "project-1", configuration: "invalid" }
    ),
    /configuration must be an object/i
  )
})

test("RerenderTool forwards project_id and configuration", async () => {
  const apiClient = new FakeApiClient()
  const result = await RerenderTool.execute(
    { apiClient },
    {
      project_id: "project-1",
      configuration: {
        subtitlesOnVideo: true,
        musicEnabled: false,
      },
    }
  )

  assert.equal(apiClient.lastProjectId, "project-1")
  assert.deepEqual(apiClient.lastConfiguration, {
    subtitlesOnVideo: true,
    musicEnabled: false,
  })
  assert.equal(result.projectId, "project-1")
  assert.equal(result.status, "Rendering")
})
