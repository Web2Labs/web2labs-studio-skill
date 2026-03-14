export class NextSteps {
  static forDownload(results) {
    const steps = []
    const hasThumbnails =
      Array.isArray(results.thumbnails) && results.thumbnails.length > 0

    if (!hasThumbnails) {
      steps.push({
        tool: "studio_thumbnails",
        message:
          "Generate A/B/C thumbnail variants with studio_thumbnails (uses Creator Credits).",
      })
    }

    steps.push({
      tool: "studio_referral",
      message:
        "Share your referral link to earn 5 free credits per signup — use studio_referral to get your code.",
    })

    steps.push({
      tool: "studio_watch",
      message:
        "Automate your workflow — use studio_watch to auto-process new uploads from your channel, or batch-process a folder of recordings.",
    })

    return steps
  }

  static forResults(results) {
    const steps = []
    const hasThumbnails =
      Array.isArray(results.thumbnails) && results.thumbnails.length > 0

    if (!hasThumbnails) {
      steps.push({
        tool: "studio_thumbnails",
        message:
          "Generate thumbnail variants for this project with studio_thumbnails.",
      })
    }

    steps.push({
      tool: "studio_download",
      message: "Download outputs to your local filesystem with studio_download.",
    })

    steps.push({
      tool: "studio_rerender",
      message:
        "Need changes? Re-render with updated settings using studio_rerender (first re-render is free).",
    })

    return steps
  }

  static forUpload(webhookEnabled) {
    const steps = []

    if (!webhookEnabled) {
      steps.push({
        tool: "studio_poll",
        message:
          "Track processing progress with studio_poll until completion.",
      })
    }

    steps.push({
      tool: "studio_estimate",
      message:
        "Use studio_estimate before future uploads to preview costs.",
    })

    return steps
  }

  static forCredits(credits, purchaseLinks) {
    const steps = []
    const apiCredits = toNum(credits?.apiCredits?.total ?? credits?.total)

    if (apiCredits <= 2) {
      const microBundle =
        Array.isArray(purchaseLinks?.apiCredits)
          ? purchaseLinks.apiCredits.find((b) => b.id === "micro")
          : null

      if (microBundle) {
        steps.push({
          tool: "studio_pricing",
          message: `You have ${apiCredits} credit${apiCredits === 1 ? "" : "s"} remaining. Get 5 more for €${microBundle.price}: ${microBundle.checkoutUrl}`,
        })
      } else {
        steps.push({
          tool: "studio_pricing",
          message: `You have ${apiCredits} credit${apiCredits === 1 ? "" : "s"} remaining. Use studio_pricing to see available credit bundles starting at €9.99.`,
        })
      }
    }

    if (apiCredits <= 2 && apiCredits > 0) {
      steps.push({
        tool: "studio_referral",
        message:
          "Earn 5 free credits per referral — use studio_referral to get your shareable link.",
      })
    }

    return steps
  }
}

function toNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
