<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LoveOS (AI Studio app)

This repository contains the full source for the LoveOS web app exported from AI Studio.

View the app in AI Studio: https://ai.studio/apps/drive/1cwkdYyCOVLjfbpUOFGsIrnetbVgvddr7

## Run locally

**Prerequisites**
- Node.js 18+
- npm

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - Copy `.env` and set `GEMINI_API_KEY` to a valid key.
3. Start the development server:
   ```bash
   npm run dev
   ```

## Build for production

```bash
npm run build
```

## Preview production build locally

```bash
npm run preview
```
