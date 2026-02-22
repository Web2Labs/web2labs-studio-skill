import test from "node:test"
import assert from "node:assert/strict"
import { CreditsTool } from "../src/tools/credits.mjs"

class FakeApiClient {
  async getCredits() {
    return {
      total: 2,
      hasCredits: true,
      apiCredits: { total: 2 },
      creatorCredits: { total: 18 },
      subscription: {
        tier: "creator",
        monthlyLimit: 100,
        monthlyUsed: 84,
        monthlyRemaining: 16,
      },
    }
  }

  async getPricing() {
    return {
      apiCreditBundles: [
        { id: "casual", credits: 10, price: 22.99, currency: "EUR" },
        { id: "starter", credits: 20, price: 39.99, currency: "EUR" },
      ],
      creatorCreditBundles: [
        { id: "topup_s", credits: 120, price: 9.99, currency: "EUR" },
        { id: "topup_m", credits: 330, price: 24.99, currency: "EUR" },
      ],
    }
  }

  async getAnalytics() {
    return {
      thisMonth: { projectsProcessed: 1, apiCreditsUsed: 12, creatorCreditsUsed: 40 },
    }
  }
}

test("CreditsTool adds upsell alerts and purchase links", async () => {
  const result = await CreditsTool.execute({
    apiClient: new FakeApiClient(),
    apiEndpoint: "https://web2labs.com",
  })

  assert.equal(result.total, 2)
  assert.ok(Array.isArray(result.upsell.alerts))
  assert.ok(result.upsell.alerts.length >= 2)
  assert.equal(result.upsell.purchaseLinks.ref, "openclaw")
  assert.match(
    result.upsell.purchaseLinks.subscriptions.creator,
    /checkout\/subscribe\/creator\?ref=openclaw/i
  )
})
