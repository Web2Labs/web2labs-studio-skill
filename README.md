# Web2Labs Studio - OpenClaw Skill

AI-powered video editing from your terminal.

## Quick Start

1. Install: `clawhub install @web2labs/studio`
2. Setup: `Run studio_setup with action send_magic_link and my email`
3. Edit: `Edit ~/Desktop/my-recording.mp4 as a youtube video`

## Features

- Jump-cut editing
- Auto subtitles
- Shorts generation
- AI thumbnail generation (A/B/C variants)
- Brand kit management (colors/fonts/identity defaults)
- Reusable intro/outro/watermark asset management
- Pricing and pre-upload cost estimation
- Usage analytics for projects/credits/time saved
- One-click brand import from YouTube/Twitch/X URLs
- URL input via yt-dlp (YouTube/Twitch/Vimeo)
- Optional upload webhooks for fire-and-forget automation
- Batch processing workflows
- Feedback reporting directly from the agent

## Presets

- `quick`
- `youtube`
- `shorts-only`
- `podcast`
- `gaming`
- `tutorial`
- `vlog`
- `cinematic`

## Requirements

- Node.js 18+
- Web2Labs account (2 free credits on first API key generation)
- Optional: `yt-dlp` for URL workflows

## Security Notes

- API key is read from OpenClaw skill config/env injection.
- The skill never logs full key values.
- URL downloads happen locally on the user machine.

## Setup Tool

`studio_setup` supports:
- `send_magic_link` (email required)
- `complete_setup` (email + code required)
- `save_api_key` (api_key required)

## Tooling Overview

- `studio_credits`: Check API + Creator Credit balances.
- `studio_pricing`: Fetch pricing metadata for premium features.
- `studio_estimate`: Estimate API/Creator cost before upload.
- `studio_upload`: Upload local files or supported URLs (`priority: "rush"` available, 2 API credits, optional `webhook_url`).
- `studio_poll`: Wait for completion with smart polling.
- `studio_results`: Inspect outputs and retention metadata.
- `studio_thumbnails`: Generate thumbnail variants for completed projects.
- `studio_rerender`: Re-render completed projects with config changes (no re-upload).
- `studio_download`: Download main video, shorts, subtitles, transcription, and thumbnails.
- `studio_analytics`: Usage and ROI metrics.
- `studio_brand`: Read/update brand kit settings used for future outputs.
- `studio_brand_import`: Import suggested brand settings from channel profile URL.
- `studio_assets`: Upload/list/delete reusable intro/outro/watermark assets.
- `studio_feedback`: Submit bugs/suggestions/questions.

## Spend Confirmation

Paid actions can require explicit confirmation based on spend policy:
- `WEB2LABS_SPEND_POLICY=smart` (default)
- `WEB2LABS_SPEND_POLICY=explicit`
- `WEB2LABS_SPEND_POLICY=auto`

If a tool returns `spend_confirmation_required`, ask the user and call again with:
- `confirm_spend: true`

`studio_pricing` and `studio_credits` include purchase links with `ref=openclaw` for direct checkout.

## Security Best Practices

- Never paste API keys into prompts or logs.
- Keep OpenClaw config files restricted to your user account.
- Use HTTPS API endpoints only.
- Verify you own rights to content before URL-based downloads/uploads.
- Rotate API keys immediately if you suspect exposure.

## Links

- https://web2labs.com/openclaw
- https://web2labs.com/docs-api
- https://github.com/web2labs/web2labs-studio-examples
