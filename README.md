# QA Automation Hub (ZyluCo)

> **Enterprise Multi-Platform Test Automation Framework**  
> Architected for Web (Playwright), API (Playwright Request / HTTP Engine), Mobile (Flutter via Appium), and Performance (k6) using **Vertical Slice Architecture**.

---

## 🏛 Architecture Overview

The **QA Automation Hub** is designed to scale across multiple platforms and domains with zero friction. Rather than separating code purely by technical layer (e.g., all locators in one folder, all tests in another), tests are organized by **Business Domains / Vertical Slices** under `modules/`.

```
                        ┌──────────────────────────────────────────────┐
                        │              QA Automation Hub               │
                        └──────────────────────┬───────────────────────┘
                                               │
             ┌───────────────────┬─────────────┴───────┬───────────────────┐
             │                   │                     │                   │
    ┌────────▼─────────┐┌────────▼─────────┐  ┌────────▼─────────┐┌────────▼─────────┐
    │  Web Automation  ││  API Automation  │  │ Mobile (Flutter) ││ Performance (k6) │
    │    Playwright    ││ Playwright / API │  │  Appium Flutter  ││   SLA & Bursts   │
    └──────────────────┘└──────────────────┘  └──────────────────┘└──────────────────┘
             │                   │                     │                   │
             └───────────────────┼─────────────────────┴───────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │    Vertical Slices    │
                     │  (auth, bookings,     │
                     │  inventory, checkout) │
                     └───────────────────────┘
```

### Core Tenets:
1. **Vertical Slices (`modules/`)**: Every business domain (e.g. `auth`, `bookings`, `inventory`) encapsulates its own API clients, Web Page Objects, Flutter Screen Objects, and test specs.
2. **Framework Core (`src/core/`)**: Low-level platform abstractions for Web (`BasePage`), API (`BaseApiClient`), Mobile (`BaseScreen`, `FlutterFinders`, `FlutterGestures`), and utilities (`Logger`, `DateHelper`, `TestDataGenerator`).
3. **Cross-Module Shared (`src/shared/`)**: Reusable components (`GlobalNavbar`, `ConfirmationModal`, `FlutterBottomNav`), test fixtures (`test-base`, `auth-session`), and shared types.
4. **Reliability & Isolation**: Explicit session management without global storage collisions. Single-worker sequential execution on CI prevents state collisions on single-tenant staging environments.

---

## 📂 Repository Structure

```text
Automation_Scripts/ (qa-automation-hub)
├── .github/
│   └── workflows/
│       ├── test-api.yml                 # Runs on every PR: executes *.api.spec.ts (< 1 min)
│       ├── test-web.yml                 # Runs on PR review: executes *.web.spec.ts
│       ├── test-flutter.yml             # Runs on mobile changes: executes *.flutter.spec.ts
│       ├── test-cross-system.yml        # Nightly / Staging: executes *.cross.spec.ts
│       └── test-performance.yml         # Scheduled k6 smoke & load tests
│
├── config/                              # Multi-environment & runner configurations
│   ├── env.base.ts                      # Common timeouts, retry policies, logging level
│   ├── env.dev.ts                       # Dev environment URLs, test accounts, API gateways
│   ├── env.staging.ts                   # Staging environment endpoints
│   ├── playwright.config.ts             # Playwright configuration (Web + API projects & globs)
│   ├── wdio.flutter.config.ts           # WebdriverIO + Appium Flutter Driver capabilities (iOS/Android)
│   └── k6.config.json                   # Default k6 thresholds and SLAs
│
├── src/
│   ├── core/                            # Low-level framework engine (Platform utilities)
│   │   ├── api/
│   │   │   ├── base-api-client.ts       # HTTP request wrapper (auth headers, logging, retries)
│   │   │   └── api-assertions.ts        # Status, schema, and latency assertion helpers
│   │   ├── web/
│   │   │   ├── base-page.ts             # Base Playwright Page Object (waits, navigations, toasts)
│   │   │   └── web-helpers.ts           # Browser context & storage-state injection
│   │   ├── mobile/
│   │   │   ├── base-screen.ts           # Base Flutter Screen Object
│   │   │   ├── flutter-finders.ts       # Flutter VM locators (byValueKey, byText, byTooltip)
│   │   │   ├── flutter-gestures.ts      # Flutter-specific touch actions (scroll, swipe, drag)
│   │   │   └── flutter-driver.ts        # Appium session manager & context switcher
│   │   └── utils/
│   │       ├── logger.ts                # Structured logger for CI output
│   │       ├── date-helper.ts           # Dynamic timestamps and date formatting
│   │       └── test-data-generator.ts   # Faker wrapper for unique test data
│   │
│   └── shared/                          # Cross-module reusable entities
│       ├── components/
│       │   ├── web/
│       │   │   ├── global-navbar.ts     # Web top navigation & profile dropdown
│       │   │   └── confirmation-modal.ts# Web generic confirmation/alert dialogs
│       │   └── mobile/
│       │       └── flutter-bottom-nav.ts# Reusable Flutter BottomNavigationBar
│       ├── fixtures/
│       │   ├── test-base.ts             # Custom Playwright test fixture binding all clients
│       │   ├── auth-session.fixture.ts  # Pre-authenticates via API; bypasses UI login
│       │   └── state-cleaner.fixture.ts # Black-box teardown hook (cleans test data via API)
│       └── types/
│           ├── common.types.ts          # Shared pagination, error response, and status types
│           └── user-role.types.ts       # User roles (e.g. Admin, Customer, Support)
│
├── modules/                             # VERTICAL SLICES
│   ├── auth/                            # Domain: Authentication & Session Management
│   │   ├── api/auth.client.ts
│   │   ├── mobile/locators/auth.keys.ts
│   │   ├── mobile/login.screen.ts
│   │   ├── tests/auth.api.spec.ts
│   │   ├── tests/auth.web.spec.ts
│   │   ├── tests/auth.flutter.spec.ts
│   │   └── web/login.page.ts
│   ├── bookings/                        # Domain: Slot Selection, Reservations & Booking Lifecycle
│   │   ├── api/bookings.client.ts
│   │   ├── mobile/locators/booking.keys.ts
│   │   ├── mobile/booking.screen.ts
│   │   ├── tests/bookings.api.spec.ts
│   │   ├── tests/booking-admin.web.spec.ts
│   │   ├── tests/booking.flutter.spec.ts
│   │   ├── tests/booking-flow.cross.spec.ts
│   │   ├── tests/booking.visual.spec.ts
│   │   └── web/booking-admin.page.ts
│   ├── inventory/                       # Domain: Service Catalog, Resource & Capacity Management
│   │   ├── api/inventory.client.ts
│   │   ├── mobile/locators/catalog.keys.ts
│   │   ├── mobile/catalog.screen.ts
│   │   ├── tests/inventory.api.spec.ts
│   │   ├── tests/inventory.web.spec.ts
│   │   ├── tests/catalog.flutter.spec.ts
│   │   └── web/inventory-grid.page.ts
│   ├── notifications/                   # Domain: Push Notifications & SMS/Emails
│   │   ├── api/notifications.client.ts
│   │   ├── mobile/locators/notification.keys.ts
│   │   ├── mobile/notification-center.screen.ts
│   │   ├── tests/notifications.api.spec.ts
│   │   └── tests/notification.flutter.spec.ts
│   ├── checkout/                        # Domain: Billing, Coupons, Tips, Redemptions
│   │   ├── web/checkout.page.ts
│   │   └── tests/checkout.web.spec.ts
│   └── reports/                         # Domain: Daily Revenue, Staff Commissions & Summaries
│       ├── web/reports.page.ts
│       └── tests/reports.web.spec.ts
│
├── performance/                         # k6 Load & Smoke Testing
│   ├── scenarios/
│   │   ├── api-smoke.js                 # 5-minute health/SLA check across critical endpoints
│   │   └── booking-burst.js             # Simulates high-concurrency booking rushes
│   └── helpers/
│       └── k6-auth.js                   # Obtains JWT bearer tokens for k6 virtual users
│
├── scripts/                             # Local automation & developer productivity
│   ├── run-flutter-emulators.sh         # Boots Android AVD / iOS Simulator
│   └── clean-test-artifacts.sh          # Cleans up old traces, allure reports, and temp videos
│
├── tests/                               # Existing baseline regression suite (21 feature tests)
├── .env.example                         # Base URL and test secret definitions
├── .eslintrc.json                       # Linting rules
├── .prettierrc                          # Shared code formatting
├── package.json                         # Dependencies & test scripts
├── tsconfig.json                        # Path aliasing (@core/*, @modules/*, @shared/*)
└── README.md                            # Complete setup & architecture documentation
```

---

## 🚀 Quickstart & Test Execution

### 1. Installation
```bash
npm install
npx playwright install --with-deps chromium
```

### 2. Running Web Tests
Executes all web specs across `modules/` and legacy `tests/`:
```bash
npm run test:web
```
Or run a specific module:
```bash
npx playwright test modules/auth/tests/auth.web.spec.ts
```

### 3. Running API Tests
Fast regression specs executing in under a minute:
```bash
npm run test:api
```

### 4. Running Cross-System Tests
Verifies end-to-end integration across Web, API, and Mobile:
```bash
npm run test:cross
```

### 5. Running Visual Regression Tests
Captures and matches visual snapshots against baselines:
```bash
npm run test:visual
```

### 6. Running Performance Tests (k6)
Install [k6](https://k6.io/docs/get-started/installation/) and run:
```bash
# Smoke test (SLA & Health check)
k6 run performance/scenarios/api-smoke.js

# Spike / Burst load test
k6 run performance/scenarios/booking-burst.js
```

### 7. Running Mobile Tests (Flutter)
Boots the emulator and executes the Appium Flutter suite:
```bash
# Start emulator
bash scripts/run-flutter-emulators.sh android

# Run Flutter mobile specs
npx wdio run config/wdio.flutter.config.ts
```

### 8. Cleanup Artifacts
```bash
npm run clean
```

---

## 🛠 Adding a New Domain Module

To add a new feature domain (e.g., `customers`):

1. **Create Slice Directory**:
   ```bash
   mkdir -p modules/customers/{api,web,mobile/locators,tests}
   ```
2. **Implement API Client**: Extend `BaseApiClient` in `modules/customers/api/customers.client.ts`.
3. **Implement Web Page Object**: Extend `BasePage` in `modules/customers/web/customers.page.ts`.
4. **Implement Mobile Screen**: Extend `BaseScreen` in `modules/customers/mobile/customer.screen.ts`.
5. **Add Spec Files**:
   - `customers.api.spec.ts` (tagged with `@api`)
   - `customers.web.spec.ts` (tagged with `@web`)
   - `customer.flutter.spec.ts` (tagged with `@flutter`)

---

## 🚦 CI/CD Pipelines

GitHub Actions workflows are configured in `.github/workflows/`:
| Workflow | Trigger | Execution Scope | Target SLA |
| :--- | :--- | :--- | :--- |
| `test-api.yml` | Every PR / Push | `*.api.spec.ts` | < 1 minute |
| `test-web.yml` | PR Review / Main push | `*.web.spec.ts` & web specs | ~15 minutes |
| `test-flutter.yml` | Mobile code change | `*.flutter.spec.ts` (macOS) | ~20 minutes |
| `test-cross-system.yml` | Nightly (2 AM UTC) | `*.cross.spec.ts` | ~15 minutes |
| `test-performance.yml` | Weekly (Sunday 3 AM) | k6 smoke & booking burst | ~10 minutes |
