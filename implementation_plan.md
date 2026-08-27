# Implementation Plan: AI-Powered Crypto & Stock Portfolio Tracker (MERN)

Build a full-stack portfolio tracker application using MongoDB, Express, React (Vite), and Node.js. The key highlight is AI-powered screenshot parsing using Google Gemini Vision to extract crypto and stock holdings, requiring user review before committing to the database.

## User Review Required

> [!IMPORTANT]
> **API Keys & Database Setup**:
> - **MongoDB**: We will configure `server/src/config/db.js` to attempt connection via `MONGODB_URI` from `.env`. If no URI is provided or local `mongod` is offline, it will seamlessly spin up `mongodb-memory-server` so the application runs out of the box without requiring local database setup.
> - **Gemini API**: Gemini Vision (`@google/genai`) will be used in `POST /api/extract`. If `GEMINI_API_KEY` is not present, a clean mock extraction engine will provide realistic sample data so all features can be demonstrated smoothly.
> - **Price Data**: CoinMarketCap API and stock price providers will be integrated with `PriceCache`. Fallback live-simulation prices will be provided if `COINMARKETCAP_API_KEY` is omitted.

> [!TIP]
> **Mandatory Review-Before-Save UX**:
> In accordance with Feature 4 instructions, extracted holdings will **never** be auto-saved to MongoDB. They will render in an interactive staging modal for user validation, editing, and single-click batch saving.

---

## Proposed Changes

### 1. Server Stack (`server/`)

#### [NEW] [package.json](file:///c:/Code/portfolio/server/package.json)
- Dependencies: `express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, `bcryptjs`, `multer`, `@google/genai`, `axios`, `node-cron`, `mongodb-memory-server` (dev/fallback).

#### [NEW] [db.js](file:///c:/Code/portfolio/server/src/config/db.js)
- Database connection configuration with auto-fallback to MongoDB Memory Server if `MONGODB_URI` is missing.

#### [NEW] Data Models:
- [User.js](file:///c:/Code/portfolio/server/src/models/User.js): Schema for `email`, `password` (hashed), `createdAt`.
- [Holding.js](file:///c:/Code/portfolio/server/src/models/Holding.js): Schema for `userId`, `assetType` (`crypto`|`stock`|`cash`), `symbol`, `quantity`, `avgBuyPrice`, `walletOrAccount`, `notes`, `timestamps`.
- [PriceCache.js](file:///c:/Code/portfolio/server/src/models/PriceCache.js): Schema for `symbol`, `price`, `assetType`, `lastUpdated`.

#### [NEW] Middleware:
- [auth.js](file:///c:/Code/portfolio/server/src/middleware/auth.js): JWT token authentication middleware with inline educational comments explaining token verification.
- [upload.js](file:///c:/Code/portfolio/server/src/middleware/upload.js): Multer middleware to process image file uploads in memory for Gemini Vision processing.

#### [NEW] Services:
- [geminiService.js](file:///c:/Code/portfolio/server/src/services/geminiService.js): Formats screenshot images, prompts Gemini with strict JSON schema instructions, validates returned JSON structure (handling retries on malformed JSON), and returns parsed array.
- [priceService.js](file:///c:/Code/portfolio/server/src/services/priceService.js): Periodically refreshes price cache via `node-cron`, fetches prices from CoinMarketCap / Stock API, and provides fallback quotes.

#### [NEW] API Routes:
- [auth.js](file:///c:/Code/portfolio/server/src/routes/auth.js): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- [holdings.js](file:///c:/Code/portfolio/server/src/routes/holdings.js): `POST /api/holdings`, `GET /api/holdings`, `PATCH /api/holdings/:id`, `DELETE /api/holdings/:id`, plus `POST /api/holdings/batch` for confirm & save.
- [prices.js](file:///c:/Code/portfolio/server/src/routes/prices.js): `GET /api/prices`, `POST /api/prices/refresh`.
- [extract.js](file:///c:/Code/portfolio/server/src/routes/extract.js): `POST /api/extract` (handles upload -> Gemini extraction -> schema validation).

#### [NEW] [index.js](file:///c:/Code/portfolio/server/src/index.js)
- Express entrypoint, routes setup, CORS setup, cron initialization.

---

### 2. Client Stack (`client/`)

#### [NEW] Setup & Styling:
- Vite React app configured with Tailwind CSS v4 / PostCSS.
- Theme: Dark glassmorphic design system with vibrant gradients, custom typography, micro-interactions, responsive design.

#### [NEW] Frontend Modules:
- [axiosInstance.js](file:///c:/Code/portfolio/client/src/api/axiosInstance.js): Axios instance with JWT auth header interceptor.
- [AuthContext.jsx](file:///c:/Code/portfolio/client/src/context/AuthContext.jsx): Global authentication context holding user state and token management.
- [PortfolioSummary.jsx](file:///c:/Code/portfolio/client/src/components/PortfolioSummary.jsx): Metrics card showing Total Portfolio Value, Total Profit/Loss ($ and %), Asset allocation progress bar.
- [AssetTypeTabs.jsx](file:///c:/Code/portfolio/client/src/components/AssetTypeTabs.jsx): Filter tab bar (All, Crypto, Stocks, Cash).
- [HoldingsTable.jsx](file:///c:/Code/portfolio/client/src/components/HoldingsTable.jsx):
  - Grouped table of holdings.
  - **Inline Editing (Feature 2)**: Click-to-edit input fields for quantity, buy price, symbol, wallet.
  - **Optimistic UI**: Instant UI update on change, rollback on error, row-level status indicator badge ("Saved" / "Saving..." / "Error").
  - Current price, current total value, profit/loss display with green/red formatting.
- [HoldingFormModal.jsx](file:///c:/Code/portfolio/client/src/components/HoldingFormModal.jsx): Modal to manually add or edit a holding.
- [ScreenshotUploadModal.jsx](file:///c:/Code/portfolio/client/src/components/ScreenshotUploadModal.jsx): Drag-and-drop / file input zone with image preview, extract button, loading spinner.
- [ExtractionReviewModal.jsx](file:///c:/Code/portfolio/client/src/components/ExtractionReviewModal.jsx): **Feature 4 UX Review Stage** — displays extracted data in an editable table so users can double-check/adjust before clicking "Confirm & Add to Portfolio".

---

## Verification Plan

### Automated Verification
1. **Server Build & Dependencies**: Verify backend syntax and routes compilation.
2. **API Endpoint Verification**:
   - Register/login user via script/requests.
   - Test CRUD `/api/holdings` endpoints.
   - Test `/api/prices` caching.
   - Test `/api/extract` mock/Gemini payload validation.

### Manual Verification
1. **Auth Flow**: Test registration, login, logout, and token persistence.
2. **Manual CRUD**: Add holdings (Crypto, Stock, Cash), edit them via inline click-to-edit, delete holdings.
3. **Inline Click-to-Edit Optimistic UI**: Verify instant UI update, blur/enter triggers `PATCH /api/holdings/:id`, error indicator on network failure.
4. **Price Caching**: Verify calculated holding values (`quantity * price`) and portfolio totals update based on cached prices.
5. **AI Extraction Review Flow**: Upload sample crypto wallet screenshot -> verify preview -> extract data -> review table -> modify field -> click "Confirm & Add" -> check dashboard table.
