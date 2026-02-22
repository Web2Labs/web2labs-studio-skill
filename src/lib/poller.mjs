export class ProjectPoller {
  static POLL_INTERVALS = {
    start: 3000,
    uploading: 3000,
    editing: 10000,
    manual: 15000,
    rendering: 15000,
    completed: 0,
    failed: 0,
  }

  static async wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  static normalizeStatus(rawStatus) {
    return String(rawStatus || "").trim().toLowerCase()
  }

  static isTerminalStatus(status) {
    return status === "completed" || status === "failed"
  }

  static getIntervalForStatus(status) {
    const normalized = ProjectPoller.normalizeStatus(status)
    return ProjectPoller.POLL_INTERVALS[normalized] || 10000
  }

  static async poll(apiClient, projectId, options = {}) {
    const timeoutMinutes = Number(options.timeoutMinutes || options.timeout_minutes || 30)
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null
    const deadline = Date.now() + timeoutMinutes * 60 * 1000
    let lastStatus = null

    while (Date.now() < deadline) {
      const status = await apiClient.getProjectStatus(projectId)
      const normalized = ProjectPoller.normalizeStatus(status.status)

      if (normalized !== lastStatus) {
        lastStatus = normalized
        if (onProgress) {
          await onProgress({
            projectId,
            status: status.status,
            progress: status.progress,
            retentionTimeRemaining: status.retentionTimeRemaining || null,
          })
        }
      }

      if (ProjectPoller.isTerminalStatus(normalized)) {
        return status
      }

      const interval = ProjectPoller.getIntervalForStatus(status.status)
      if (interval > 0) {
        await ProjectPoller.wait(interval)
      }
    }

    throw new Error(`Polling timed out after ${timeoutMinutes} minutes`) 
  }
}
