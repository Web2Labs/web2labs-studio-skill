import { basename } from "node:path"
import { WatchStore } from "../lib/watch-store.mjs"
import { VideoDownloader } from "../lib/downloader.mjs"
import { PresetCatalog } from "../lib/presets.mjs"

export class WatchTool {
  static normalizeAction(value) {
    return String(value || "list").trim().toLowerCase()
  }

  static async executeAdd(context, params) {
    const url = String(params.url || "").trim()
    if (!url) {
      throw new Error("url is required when action is 'add'")
    }

    if (!VideoDownloader.isSupportedUrl(url)) {
      throw new Error(
        "Unsupported URL. Provide a YouTube or Twitch channel URL."
      )
    }

    if (!WatchStore.isChannelUrl(url)) {
      throw new Error(
        "Provide a channel or user URL, not a single video URL. " +
        "Examples: https://youtube.com/@username, https://twitch.tv/username"
      )
    }

    const ytdlp = await VideoDownloader.checkYtDlp()
    if (!ytdlp.installed) {
      throw new Error(
        "yt-dlp is required for watch mode. Install with: " +
        "brew install yt-dlp (macOS), pip install yt-dlp (Linux), winget install yt-dlp (Windows)."
      )
    }

    if (params.preset) {
      PresetCatalog.resolvePreset(params.preset)
    }

    const watcher = await WatchStore.add({
      url,
      preset: params.preset || context.defaultPreset || "youtube",
      configuration: params.configuration || {},
      pollIntervalMinutes: params.poll_interval_minutes,
      maxDurationMinutes: params.max_duration_minutes,
      maxDailyUploads: params.max_daily_uploads,
      outputDir: params.output_dir || null,
    })

    return {
      action: "add",
      watcher,
      warning: "Only watch channels you own or have explicit permission to process.",
    }
  }

  static async executeList() {
    const watchers = await WatchStore.list()
    return {
      action: "list",
      count: watchers.length,
      watchers: watchers.map((w) => ({
        id: w.id,
        label: w.label,
        url: w.url,
        type: w.type,
        preset: w.preset,
        enabled: w.enabled,
        lastChecked: w.lastChecked,
        uploadsToday: WatchStore.getUploadsToday(w),
        maxDailyUploads: w.maxDailyUploads,
      })),
    }
  }

  static async executeRemove(params) {
    const id = String(params.id || "").trim()
    if (!id) {
      throw new Error("id is required when action is 'remove'")
    }

    const removed = await WatchStore.remove(id)
    if (!removed) {
      throw new Error(`Watcher not found: ${id}`)
    }

    return { action: "remove", id, removed: true }
  }

  static async executePauseResume(action, params) {
    const id = String(params.id || "").trim()
    if (!id) {
      throw new Error(`id is required when action is '${action}'`)
    }

    const enabled = action === "resume"
    const watcher = await WatchStore.update(id, { enabled })
    if (!watcher) {
      throw new Error(`Watcher not found: ${id}`)
    }

    return { action, id, enabled: watcher.enabled }
  }

  static async executeStatus(params) {
    const id = String(params.id || "").trim()
    if (!id) {
      throw new Error("id is required when action is 'status'")
    }

    const watcher = await WatchStore.get(id)
    if (!watcher) {
      throw new Error(`Watcher not found: ${id}`)
    }

    const uploadsToday = WatchStore.getUploadsToday(watcher)
    const remaining = WatchStore.getRemainingUploads(watcher)

    let nextCheckDue = null
    if (watcher.lastChecked && watcher.enabled) {
      const lastMs = new Date(watcher.lastChecked).getTime()
      const nextMs = lastMs + watcher.pollIntervalMinutes * 60 * 1000
      nextCheckDue = new Date(nextMs).toISOString()
    }

    return {
      action: "status",
      watcher: {
        ...watcher,
        uploadsToday,
        remainingUploads: remaining,
        nextCheckDue,
      },
    }
  }

  static async executeCheck(context, params) {
    const targetId = String(params.id || "").trim() || null

    const ytdlp = await VideoDownloader.checkYtDlp()
    if (!ytdlp.installed) {
      throw new Error("yt-dlp is required for watch mode.")
    }

    let watchers = await WatchStore.list()
    watchers = watchers.filter((w) => w.enabled)
    if (targetId) {
      watchers = watchers.filter((w) => w.id === targetId)
      if (watchers.length === 0) {
        throw new Error(`Watcher not found or disabled: ${targetId}`)
      }
    }

    if (watchers.length === 0) {
      return { action: "check", processed: 0, results: [], message: "No enabled watchers." }
    }

    const results = []

    for (const watcher of watchers) {
      const remaining = WatchStore.getRemainingUploads(watcher)
      if (remaining <= 0) {
        results.push({
          watcherId: watcher.id,
          label: watcher.label,
          skipped: true,
          reason: "daily_upload_cap_reached",
        })
        continue
      }

      let videos
      try {
        videos = await VideoDownloader.listChannelVods(watcher.url, 10)
      } catch (err) {
        results.push({
          watcherId: watcher.id,
          label: watcher.label,
          skipped: true,
          reason: "list_failed",
          error: err?.message || String(err),
        })
        continue
      }

      const newVideos = WatchStore.filterNewVideos(watcher, videos).slice(0, remaining)

      if (newVideos.length === 0) {
        await WatchStore.update(watcher.id, { lastChecked: new Date().toISOString() })
        results.push({
          watcherId: watcher.id,
          label: watcher.label,
          checked: true,
          newVideos: 0,
          uploaded: 0,
        })
        continue
      }

      const uploadedIds = []
      const uploads = []

      for (const video of newVideos) {
        let tmpDir = null
        try {
          const videoUrl = WatchTool.buildVideoUrl(watcher.type, video.id)
          const download = await VideoDownloader.download(videoUrl)
          tmpDir = download.tmpDir

          const configuration = PresetCatalog.resolvePreset(watcher.preset)
          if (watcher.configuration && typeof watcher.configuration === "object") {
            Object.assign(configuration, watcher.configuration)
          }

          const result = await context.apiClient.uploadProject(download.filePath, {
            name: video.title || basename(download.filePath),
            configuration,
          })

          uploadedIds.push(video.id)
          uploads.push({
            videoId: video.id,
            title: video.title,
            projectId: result.projectId || result.id,
            status: result.status || "Uploading",
          })
        } catch (err) {
          uploads.push({
            videoId: video.id,
            title: video.title,
            error: err?.message || String(err),
          })
        } finally {
          if (tmpDir) {
            await VideoDownloader.cleanup(tmpDir)
          }
        }
      }

      if (uploadedIds.length > 0) {
        await WatchStore.markProcessed(watcher.id, uploadedIds)
      } else {
        await WatchStore.update(watcher.id, { lastChecked: new Date().toISOString() })
      }

      results.push({
        watcherId: watcher.id,
        label: watcher.label,
        checked: true,
        newVideos: newVideos.length,
        uploaded: uploadedIds.length,
        uploads,
      })
    }

    const totalUploaded = results.reduce((sum, r) => sum + (r.uploaded || 0), 0)
    return {
      action: "check",
      processed: results.length,
      totalUploaded,
      results,
    }
  }

  static buildVideoUrl(type, videoId) {
    if (type === "twitch_channel") {
      return `https://www.twitch.tv/videos/${videoId}`
    }
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  static async execute(context, params) {
    const action = WatchTool.normalizeAction(params.action)

    if (action === "add") return WatchTool.executeAdd(context, params)
    if (action === "list") return WatchTool.executeList()
    if (action === "remove") return WatchTool.executeRemove(params)
    if (action === "pause") return WatchTool.executePauseResume("pause", params)
    if (action === "resume") return WatchTool.executePauseResume("resume", params)
    if (action === "status") return WatchTool.executeStatus(params)
    if (action === "check") return WatchTool.executeCheck(context, params)

    throw new Error(
      "Invalid action. Use one of: add, list, remove, check, pause, resume, status."
    )
  }
}
