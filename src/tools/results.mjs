export class ResultsTool {
  static async execute(context, params) {
    const projectId = String(params.project_id || "").trim()
    if (!projectId) {
      throw new Error("project_id is required")
    }

    const results = await context.apiClient.getProjectResults(projectId)
    return {
      projectId,
      ...results,
    }
  }
}
