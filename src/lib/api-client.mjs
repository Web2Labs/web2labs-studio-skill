import FormData from "form-data"
import fetch from "node-fetch"
import { createReadStream, createWriteStream } from "node:fs"
import { access, mkdir } from "node:fs/promises"
import { dirname, isAbsolute, join } from "node:path"
import { pipeline } from "node:stream/promises"

export class StudioApiError extends Error {
  constructor(message, code = "api_error", status = 500, details = null) {
    super(message)
    this.name = "StudioApiError"
    this.code = code
    this.status = status
    this.details = details
  }
}

export class StudioApiClient {
  constructor(config = {}) {
    this.baseUrl = (config.apiEndpoint || "https://web2labs.com").replace(/\/$/, "")
    this.apiKey = config.apiKey || null
    this.bearerToken = config.bearerToken || null
    this.basicAuth = config.basicAuth || null
    this.maxRetries = Number.isFinite(Number(config.maxRetries))
      ? Number(config.maxRetries)
      : 3
    this.userAgent = config.userAgent || "web2labs-openclaw-skill/1.0.0"
  }

  setBearerToken(token) {
    this.bearerToken = token || null
  }

  setApiKey(key) {
    this.apiKey = key || null
  }

  getBasicAuthHeader() {
    if (!this.basicAuth) return {}
    const encoded = Buffer.from(this.basicAuth).toString("base64")
    return { Authorization: `Basic ${encoded}` }
  }

  getAuthHeaders() {
    const basicHeaders = this.getBasicAuthHeader()

    if (this.apiKey) {
      return { ...basicHeaders, "X-API-Key": this.apiKey }
    }
    if (this.bearerToken) {
      // Bearer token occupies the Authorization header, so basic auth
      // cannot be sent simultaneously. This is acceptable because bearer
      // tokens are only used briefly during the setup flow — for test
      // instances behind HTTP basic auth, use `save_api_key` instead.
      return { Authorization: `Bearer ${this.bearerToken}` }
    }
    throw new StudioApiError(
      "No authentication configured. Set WEB2LABS_API_KEY or WEB2LABS_BEARER_TOKEN.",
      "missing_auth",
      401
    )
  }

  normalizePath(pathname) {
    if (!pathname.startsWith("/")) {
      return `/${pathname}`
    }
    return pathname
  }

  resolveUrl(pathname) {
    if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
      return pathname
    }
    const normalized = this.normalizePath(pathname)
    if (normalized.startsWith("/api/")) {
      return `${this.baseUrl}${normalized}`
    }
    return `${this.baseUrl}/api/v1${normalized}`
  }

  async wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  getBackoffMs(attempt) {
    return Math.min(8000, Math.pow(2, attempt) * 1000)
  }

  normalizeHeaders(inputHeaders = {}) {
    const headers = { ...inputHeaders }
    if (!headers["User-Agent"] && !headers["user-agent"]) {
      headers["User-Agent"] = this.userAgent
    }
    return headers
  }

  async parseResponse(response) {
    const raw = await response.text()
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  isRetryableStatus(status) {
    return status >= 500 || status === 429
  }

  async request(method, pathname, options = {}) {
    const url = this.resolveUrl(pathname)
    const timeoutMs = Number(options.timeoutMs) || 30000
    const shouldParseJson = options.raw !== true

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const headers = {
          ...this.getAuthHeaders(),
          ...this.normalizeHeaders(options.headers || {}),
        }

        const requestInit = {
          method,
          headers,
          signal: controller.signal,
          body: options.body,
        }

        const response = await fetch(url, requestInit)

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after") || "10")
          if (attempt < this.maxRetries) {
            await this.wait(Math.max(1000, retryAfter * 1000))
            continue
          }
        }

        if (options.raw === true) {
          if (!response.ok) {
            throw new StudioApiError(
              `Request failed with status ${response.status}`,
              "request_failed",
              response.status
            )
          }
          return response
        }

        const payload = shouldParseJson ? await this.parseResponse(response) : null

        if (!response.ok) {
          const errorCode = payload?.error?.code || "request_failed"
          const errorMessage =
            payload?.error?.message ||
            `Request failed with status ${response.status}`

          if (attempt < this.maxRetries && this.isRetryableStatus(response.status)) {
            await this.wait(this.getBackoffMs(attempt))
            continue
          }

          throw new StudioApiError(
            errorMessage,
            errorCode,
            response.status,
            payload?.error?.details || null
          )
        }

        if (payload && payload.success === false) {
          throw new StudioApiError(
            payload.error?.message || "Request failed",
            payload.error?.code || "request_failed",
            response.status,
            payload.error?.details || null
          )
        }

        if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
          return payload.data
        }

        return payload
      } catch (error) {
        if (attempt >= this.maxRetries) {
          if (error instanceof StudioApiError) {
            throw error
          }
          if (error?.name === "AbortError") {
            throw new StudioApiError("Request timed out", "timeout", 408)
          }
          throw new StudioApiError(error?.message || "Network error", "network_error", 503)
        }

        await this.wait(this.getBackoffMs(attempt))
      } finally {
        clearTimeout(timer)
      }
    }

    throw new StudioApiError("Request retries exhausted", "retry_exhausted", 503)
  }

  async getSocketToken() {
    return this.request("POST", "/api/auth/socket")
  }

  async getCredits() {
    return this.request("GET", "/credits")
  }

  async getPricing() {
    return this.request("GET", "/pricing")
  }

  async estimateCost(payload = {}) {
    return this.request("POST", "/estimate", {
      body: JSON.stringify(payload || {}),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async getAnalytics(period = null) {
    const query = period
      ? `?period=${encodeURIComponent(String(period))}`
      : ""
    return this.request("GET", `/analytics${query}`)
  }

  async getBrand() {
    return this.request("GET", "/brand")
  }

  async updateBrand(payload = {}) {
    return this.request("PUT", "/brand", {
      body: JSON.stringify(payload || {}),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async importBrand(payload = {}) {
    const body = {
      url: String(payload.url || "").trim(),
      apply: Boolean(payload.apply),
    }
    return this.request("POST", "/brand/import", {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async listAssets() {
    return this.request("GET", "/assets")
  }

  async uploadAsset(assetType, filePath) {
    const normalizedType = String(assetType || "")
      .trim()
      .toLowerCase()
    if (!["intro", "outro", "watermark"].includes(normalizedType)) {
      throw new StudioApiError(
        "assetType must be one of: intro, outro, watermark",
        "invalid_asset_type",
        400
      )
    }

    await access(filePath)
    const form = new FormData()
    form.append("file", createReadStream(filePath))

    return this.request("POST", `/assets/${normalizedType}`, {
      body: form,
      headers: form.getHeaders(),
      timeoutMs: 10 * 60 * 1000,
    })
  }

  async deleteAsset(assetId) {
    return this.request("DELETE", `/assets/${encodeURIComponent(String(assetId || ""))}`)
  }

  async uploadProject(filePath, options = {}) {
    await access(filePath)

    const form = new FormData()
    form.append("file", createReadStream(filePath))

    if (options.name) {
      form.append("name", options.name)
    }
    if (typeof options.configuration !== "undefined") {
      form.append("configuration", JSON.stringify(options.configuration))
    }
    if (options.priority) {
      form.append("priority", String(options.priority))
    }
    if (options.webhookUrl) {
      form.append("webhookUrl", String(options.webhookUrl))
    }
    if (options.webhookSecret) {
      form.append("webhookSecret", String(options.webhookSecret))
    }

    return this.request("POST", "/projects/upload", {
      body: form,
      headers: form.getHeaders(),
      timeoutMs: 10 * 60 * 1000,
    })
  }

  async getProjectStatus(projectId) {
    return this.request("GET", `/projects/${projectId}/status`)
  }

  async getProjectResults(projectId) {
    return this.request("GET", `/projects/${projectId}/results`)
  }

  async listProjectThumbnails(projectId) {
    return this.request("GET", `/projects/${projectId}/thumbnails`)
  }

  async generateProjectThumbnails(projectId, options = {}) {
    return this.request("POST", `/projects/${projectId}/thumbnails/generate`, {
      body: JSON.stringify(options || {}),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async rerenderProject(projectId, configuration = {}) {
    return this.request("POST", `/projects/${projectId}/rerender`, {
      body: JSON.stringify({ configuration }),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async listProjects(limit = 20, offset = 0) {
    return this.request("GET", `/projects?limit=${Number(limit)}&offset=${Number(offset)}`)
  }

  async deleteProject(projectId) {
    return this.request("DELETE", `/projects/${projectId}`)
  }

  async submitFeedback(payload, headers = {}) {
    return this.request("POST", "/feedback", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    })
  }

  async listFeedback(limit = 20, offset = 0, status = null) {
    const statusPart = status ? `&status=${encodeURIComponent(status)}` : ""
    return this.request(
      "GET",
      `/feedback?limit=${Number(limit)}&offset=${Number(offset)}${statusPart}`
    )
  }

  async getFeedback(feedbackId) {
    return this.request("GET", `/feedback/${feedbackId}`)
  }

  async getReferral() {
    return this.request("GET", "/referral")
  }

  async applyReferralCode(code) {
    return this.request("POST", "/referral/apply", {
      body: JSON.stringify({ code: String(code || "").trim() }),
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async downloadFile(urlOrPath, destinationPath) {
    const url = this.resolveUrl(urlOrPath)
    await mkdir(dirname(destinationPath), { recursive: true })

    const response = await this.request("GET", url, {
      raw: true,
      timeoutMs: 5 * 60 * 1000,
    })

    const stream = createWriteStream(destinationPath)
    await pipeline(response.body, stream)

    return {
      path: destinationPath,
      url,
    }
  }

  resolveOutputPath(outputDir, filename) {
    if (isAbsolute(outputDir)) {
      return join(outputDir, filename)
    }
    return join(process.cwd(), outputDir, filename)
  }
}
