# Changelog

## Unreleased
- Added `studio_setup` tool for zero-touch onboarding (`send_magic_link`, `complete_setup`, `save_api_key`).
- Hardened auth-flow error handling (`invalid_code`, `key_already_exists`, rate-limit messaging).
- Replaced placeholder OpenClaw integration/e2e tests with executable mock-API flows.
- Added monthly subscription-limit upload coverage in Studio API e2e tests.
- Added hardening test scripts (`test:hardening`, `test:live`) and live smoke test scaffolding.
- Added tool input bounds hardening for polling and project pagination.
- Added revenue-aware tools: `studio_pricing`, `studio_estimate`, `studio_thumbnails`, and `studio_analytics`.
- Added `studio_rerender` for configuration-only rerenders of completed projects.
- Added API client support for pricing, estimate, analytics, and thumbnail-generation routes.
- Added API client + mock/integration/e2e support for `/projects/:id/rerender`.
- Added unit/integration/e2e coverage for pricing/estimate/thumbnails/analytics workflows.
- Added spend-policy enforcement for paid actions (`smart|explicit|auto`) with `confirm_spend` support.
- Added checkout deep links (`ref=openclaw`) and recommendations in `studio_pricing` and `studio_credits` outputs.
- Added preflight insufficient-credit detection with purchase-link hints for paid actions.
- Added `studio_brand` tool and API client support for `/api/v1/brand` (get/update brand kit settings).
- Added `studio_brand_import` tool and API client support for `/api/v1/brand/import` (preview/apply from YouTube/Twitch/X profile URLs).
- Added upload webhook support (`webhook_url`, `webhook_secret`) for `project.completed` callbacks.
- Added `studio_assets` tool and API client support for `/api/v1/assets` (intro/outro/watermark list/upload/delete).

## 1.0.0 - 2026-02-21
- Initial OpenClaw Studio skill release.
- Added 9 core tools for upload, polling, results, download, credits, project management, and feedback.
- Added preset catalog and URL download support via yt-dlp.
