export class RerenderTool {
  static async execute(context, params) {
    const projectId = String(params?.project_id || "").trim()
    if (!projectId) {
      throw new Error("project_id is required")
    }

    const configuration = params?.configuration
    if (
      !configuration ||
      typeof configuration !== "object" ||
      Array.isArray(configuration)
    ) {
      throw new Error("configuration must be an object")
    }

    const result = await context.apiClient.rerenderProject(
      projectId,
      configuration
    )

    return {
      projectId,
      ...result,
    }
  }
}
