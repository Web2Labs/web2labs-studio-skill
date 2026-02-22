import { AuthFlow, AuthFlowError } from "../lib/auth-flow.mjs"

export class SetupTool {
  static normalizeAction(value) {
    return String(value || "send_magic_link")
      .trim()
      .toLowerCase()
  }

  static normalizeEmail(value) {
    return String(value || "").trim().toLowerCase()
  }

  static maskApiKey(apiKey) {
    const key = String(apiKey || "")
    if (!key) {
      return ""
    }
    if (key.length <= 8) {
      return `${key.slice(0, 2)}***`
    }
    return `${key.slice(0, 8)}...${key.slice(-4)}`
  }

  static assertEmail(email) {
    if (!email || !email.includes("@") || !email.includes(".")) {
      throw new AuthFlowError(
        "A valid email is required for setup.",
        "invalid_email",
        400
      )
    }
  }

  static async runSendMagicLink(context, email) {
    SetupTool.assertEmail(email)
    const result = await AuthFlow.sendMagicLink(context.apiEndpoint, email)
    return {
      action: "send_magic_link",
      sent: true,
      email: result.email,
      nextStep:
        "Check your inbox for the Web2Labs magic link, then call studio_setup with action 'complete_setup', your email, and the 6-character code.",
    }
  }

  static async runCompleteSetup(context, email, code) {
    SetupTool.assertEmail(email)
    const normalizedCode = String(code || "").trim()
    if (!normalizedCode || normalizedCode.length < 4) {
      throw new AuthFlowError(
        "A valid code is required. Provide the 6-character code from the magic link email.",
        "missing_code",
        400
      )
    }

    const tokenResult = await AuthFlow.completeMagicLinkToken(
      context.apiEndpoint,
      email,
      normalizedCode
    )
    const keyResult = await AuthFlow.generateApiKey(
      context.apiEndpoint,
      tokenResult.accessToken
    )
    const storeResult = await AuthFlow.storeApiKey(keyResult.key)

    // Use the newly generated key immediately for subsequent tool calls.
    context.apiClient.setApiKey(keyResult.key)
    context.apiClient.setBearerToken(null)

    return {
      action: "complete_setup",
      configured: true,
      userId: tokenResult.userId,
      tier: tokenResult.tier || null,
      apiKeyPrefix: keyResult.keyPrefix || SetupTool.maskApiKey(keyResult.key),
      freeCredits: Number(keyResult.freeCredits || 0),
      configPath: storeResult.path,
      message:
        "Setup complete. Your API key was generated and saved to your OpenClaw config.",
    }
  }

  static async runSaveApiKey(context, apiKey) {
    const normalized = String(apiKey || "").trim()
    if (!normalized) {
      throw new AuthFlowError(
        "api_key is required when action is 'save_api_key'.",
        "missing_api_key",
        400
      )
    }

    const storeResult = await AuthFlow.storeApiKey(normalized)
    context.apiClient.setApiKey(normalized)
    context.apiClient.setBearerToken(null)

    return {
      action: "save_api_key",
      configured: true,
      apiKeyPrefix: SetupTool.maskApiKey(normalized),
      configPath: storeResult.path,
      message: "API key saved to OpenClaw config.",
    }
  }

  static async execute(context, params) {
    const action = SetupTool.normalizeAction(params.action)
    const email = SetupTool.normalizeEmail(params.email)

    if (action === "send_magic_link") {
      return SetupTool.runSendMagicLink(context, email)
    }

    if (action === "complete_setup") {
      return SetupTool.runCompleteSetup(context, email, params.code)
    }

    if (action === "save_api_key") {
      return SetupTool.runSaveApiKey(context, params.api_key)
    }

    throw new AuthFlowError(
      "Invalid action. Use one of: send_magic_link, complete_setup, save_api_key.",
      "invalid_action",
      400
    )
  }
}
