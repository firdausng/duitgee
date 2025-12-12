# DuitGee Application - Feature Analysis Report

**Generated:** December 12, 2025
**Version:** 1.0
**Status:** Comprehensive Analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Features](#current-features)
3. [Critical Gaps](#critical-gaps)
4. [Feature Suggestions](#feature-suggestions)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Technical References](#technical-references)

---

## Executive Summary

DuitGee is a SvelteKit-based expense tracking and vault management application deployed on Cloudflare Workers. The application demonstrates a solid foundation with comprehensive expense tracking, role-based collaboration, and multi-currency support.

### Key Metrics

| Metric | Score | Details |
|--------|-------|---------|
| **Overall Completeness** | **65%** | Feature-complete for basic use cases |
| Core Expense Tracking | 85% | Robust CRUD, categories, templates |
| Collaboration Features | 50% | Invitations work, member management missing |
| Reporting & Analytics | 40% | Basic stats available, charts missing |
| Advanced Features | 20% | No budgets, recurring, attachments |

### Priority Focus Areas

1. **Member Management** - Cannot remove/manage members after invitation
2. **Receipt Attachments** - No proof of expense capability
3. **Recurring Expenses** - Manual entry for repeated expenses
4. **Budget Tracking** - No spending limits or goals
5. **Export/Import** - No data portability

---

## Current Features

### 1. Authentication & User Management

**Status:** ✅ Fully Implemented

- **User Registration**
  - Email/password registration
  - Form validation with Valibot
  - Location: `src/routes/(anonymous)/register/`

- **User Login**
  - Email/password authentication
  - JWT bearer token support
  - Session management
  - Location: `src/routes/(anonymous)/login/`

- **Password Recovery**
  - Forgot password flow
  - Email-based reset
  - Location: `src/routes/(anonymous)/forgot-password/`

- **User Settings**
  - Profile management
  - Display name synchronization across vaults
  - API: `POST /api/syncDisplayName`
  - Location: `src/routes/(auth)/settings/`

- **Advanced Auth Features**
  - Anonymous user support with account linking
  - Better Auth integration with plugins:
    - `bearer()` - JWT authentication
    - `admin()` - Admin role support
    - `organization()` - Multi-tenant organizations
    - `anonymous()` - Anonymous users

**Technical Stack:**
- Better Auth for authentication
- Dual database architecture (auth DB + app DB)
- Server hooks for session validation

---

### 2. Vault Management

**Status:** ✅ Comprehensive Implementation

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/getVaults` | List user's vaults |
| GET | `/api/getVault` | Get vault details with members |
| POST | `/api/createVault` | Create new vault |
| POST | `/api/updateVault` | Update vault settings |
| POST | `/api/deleteVault` | Soft delete vault |
| POST | `/api/setDefaultVault` | Set/unset default vault |
| GET | `/api/getVaultStatistics` | Get vault statistics |

#### Features

- **Vault Customization**
  - Name, description, color, icon
  - Location: `src/routes/(auth)/vaults/new/`

- **Multi-Currency Support**
  - 50+ currencies (USD, EUR, JPY, IDR, etc.)
  - Per-vault currency setting
  - Configuration: `src/lib/configurations/currencies.ts`

- **Multi-Locale Support**
  - 40+ locales with BCP 47 tags
  - Locale-aware date formatting
  - Configuration: `src/lib/configurations/locales.ts`

- **Default Vault**
  - Mark vault as default (star icon)
  - Quick access to primary vault

- **Vault Statistics**
  - Total expenses (amount, count)
  - Breakdown by template, category, member
  - Date range filtering (today, week, month, year, custom)
  - Location: `src/routes/(auth)/vaults/[vaultId]/statistics/`

#### Permission System

**Roles:** Owner, Admin, Member

| Permission | Owner | Admin | Member |
|------------|:-----:|:-----:|:------:|
| Create Expenses | ✅ | ✅ | ✅ |
| Edit Expenses | ✅ | ✅ | ❌ |
| Delete Expenses | ✅ | ✅ | ❌ |
| Manage Members | ✅ | ✅ | ❌ |
| Edit Vault | ✅ | ✅ | ❌ |
| Delete Vault | ✅ | ❌ | ❌ |

**Implementation:**
- Permission utilities: `src/lib/server/utils/vaultPermissions.ts`
- Functions: `getUserVaultRole()`, `checkVaultPermission()`, `requireVaultPermission()`

---

### 3. Expense Tracking

**Status:** ✅ Core Features Complete

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/getExpenses` | List expenses with pagination/filters |
| GET | `/api/getExpense` | Get single expense |
| POST | `/api/createExpense` | Create new expense |
| POST | `/api/updateExpense` | Update expense |
| POST | `/api/deleteExpense` | Soft delete expense |

#### Expense Fields

- **Amount** - Decimal value
- **Note** - Text description
- **Date** - UTC timestamp (ISO 8601 format)
- **Category** - From predefined categories
- **Payment Type** - Cash, debit, credit, transfer, e-wallet, QRIS, check, other
- **Paid By** - Assigned vault member (or null for vault-level)
- **Template** - Optional template association

#### Payment Types

```typescript
- cash: "Cash"
- debit: "Debit Card"
- credit: "Credit Card"
- transfer: "Bank Transfer"
- e_wallet: "E-Wallet"
- qris: "QRIS"
- check: "Check"
- other: "Other"
```

Configuration: `src/lib/configurations/payment-types.ts`

#### Category System

- **12 Category Groups**
  - Food & Dining, Shopping, Transportation, Entertainment, etc.

- **100+ Predefined Categories**
  - Restaurants, Groceries, Gas, Movies, etc.
  - Each with icon and color coding

- **Configuration:** `src/lib/configurations/categories.ts`

#### Features

- **Pagination**
  - Page-based navigation
  - Configurable limit (default: 10)

- **Filtering**
  - Date range (from/to)
  - Category selection
  - Member selection (multiple)
  - Filter UI: `src/routes/(auth)/vaults/[vaultId]/ExpenseFilters.svelte`

- **Soft Delete**
  - Expenses marked as deleted, not permanently removed
  - Audit trail preserved

- **Audit Trail**
  - `createdBy`, `createdAt`
  - `updatedBy`, `updatedAt`
  - `deletedBy`, `deletedAt`

#### DateTime Handling

**Pattern:** "Store UTC, Display Local"

- **Storage:** All dates in UTC ISO 8601 format
- **Display:** Converted to user's local timezone
- **Utilities:** `src/lib/utils.ts`
  - `utcToLocalDatetimeString()` - Load server data
  - `localDatetimeToUtcIso()` - Send to API
  - `formatDatetimeLocal()` - Default form values

---

### 4. Expense Templates

**Status:** ✅ Fully Implemented

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/getExpenseTemplates` | List templates for vault |
| GET | `/api/getExpenseTemplate` | Get single template |
| POST | `/api/createExpenseTemplate` | Create template |
| POST | `/api/updateExpenseTemplate` | Update template |
| POST | `/api/deleteExpenseTemplate` | Delete template |

#### Template Fields

- **Name** - Template identifier
- **Description** - Purpose/details
- **Icon** - Visual identifier (emoji)
- **Default Amount** - Pre-filled amount
- **Default Category** - Pre-selected category
- **Default Payment Type** - Pre-selected payment method
- **Assigned User** - Default "paid by" user

#### Features

- **Reusable Patterns**
  - Save common expenses as templates
  - Quick expense creation

- **Usage Tracking**
  - `usageCount` - Number of times used
  - `lastUsedAt` - Last usage timestamp
  - Incremented automatically when used

- **Vault-Scoped**
  - Templates belong to specific vault
  - Not shared across vaults

- **Two-Path Creation**
  - Create from template (pre-filled)
  - Create from scratch
  - Location: `src/routes/(auth)/vaults/[vaultId]/expenses/new/`

---

### 5. Invitation System

**Status:** ✅ Core Functionality Complete

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/getPendingInvitations` | Get received invitations |
| GET | `/api/getSentInvitations` | Get sent invitations |
| POST | `/api/createInvitation` | Invite user to vault |
| POST | `/api/acceptInvitation` | Accept invitation |
| POST | `/api/declineInvitation` | Decline invitation |

#### Features

- **Email-Based Invitations**
  - Invite by email address
  - System finds or creates user

- **Role Assignment**
  - Assign admin or member role on invite
  - Cannot invite as owner

- **Invitation Status**
  - `pending` - Awaiting response
  - `active` - Accepted (becomes vault member)
  - `declined` - Rejected

- **Invitation Management**
  - View received invitations
  - View sent invitations
  - Accept/decline actions
  - Location: `src/routes/(auth)/invitations/`

- **Notification Badge**
  - Shows count of pending invitations
  - Component: `src/lib/components/InvitationsNotificationBadge.svelte`

#### Permissions

- **Who Can Invite:** Owner, Admin
- **Who Can Accept:** Invited user
- **Who Can Decline:** Invited user

---

### 6. Statistics & Reporting

**Status:** ⚠️ Basic Implementation

#### API Endpoint

```
GET /api/getVaultStatistics?vaultId={id}&from={date}&to={date}
```

#### Available Statistics

**Total Expenses**
- Total amount
- Total count

**Breakdown by Template**
- Amount per template
- Count per template
- Template name and icon

**Breakdown by Category**
- Amount per category
- Count per category
- Category info (name, icon, color)

**Breakdown by Member**
- Amount per member
- Count per member
- Member display name

#### Date Range Filtering

Preset ranges:
- Today
- This week
- This month
- This year
- Custom range (from/to dates)

#### UI Components

- **Statistics Page**
  - Location: `src/routes/(auth)/vaults/[vaultId]/statistics/`
  - Visual statistics display
  - Date range selector
  - Breakdown tables

**Limitations:**
- No charts or visualizations
- No trend analysis
- No comparison modes
- No export capability

---

### 7. Calendar View

**Status:** ✅ Implemented

#### Features

- **Calendar Page**
  - Location: `src/routes/(auth)/vaults/[vaultId]/calendar/`
  - View expenses by date

- **Range Calendar Component**
  - Date selection UI
  - Integrates with vault locale/currency

- **Date Navigation**
  - Month/year selection
  - Quick date jumping

---

### 8. UI Components

**Status:** ✅ Comprehensive Component Library

#### Core Components (shadcn-svelte)

**Form Elements:**
- `Button` - Variants: default, destructive, outline, secondary, ghost, link
- `Input` - Two-way binding with `$bindable()`
- `Label` - Accessible form labels
- `Checkbox` - Checkboxes with validation

**Layout:**
- `Card` - Card container with sub-components (Header, Title, Description, Content, Footer)
- `Separator` - Visual dividers
- `Drawer` - Mobile-friendly drawer
- `Accordion` - Collapsible sections

**Navigation:**
- `Breadcrumb` - Page hierarchy navigation

**Feedback:**
- `Sonner` - Toast notifications
- `Spinner` - Loading indicator
- `Loading Overlay` - Full-page loading state

#### Custom Components

**Domain-Specific:**
- `MemberCombobox` - Select vault members
- `CategoryCombobox` - Select expense categories
- `IconCombobox` - Select icons (emojis)
- `RangeCalendar` - Date range picker
- `InvitationsNotificationBadge` - Pending invite count

**UI Elements:**
- `FloatingActionButton` - Quick actions (FAB)
- `ThemeToggle` - Dark mode switcher

**Location:** `src/lib/components/ui/`

---

### 9. Data Management

**Status:** ✅ Robust Implementation

#### Soft Delete Pattern

All entities support soft delete:
- Vaults
- Expenses
- Expense Templates
- Invitations (status-based)

**Benefits:**
- Data recovery possible
- Audit trail preserved
- No cascade delete issues

#### Audit Trail

Every record tracks:
- `createdBy` - User ID who created
- `createdAt` - UTC timestamp
- `updatedBy` - User ID who last updated
- `updatedAt` - UTC timestamp
- `deletedBy` - User ID who deleted
- `deletedAt` - UTC timestamp (null if active)

**Utilities:** `src/lib/server/utils/audit.ts`
- `createAuditFields(context)` - For inserts
- `updateAuditFields(context)` - For updates
- `deleteAuditFields(context)` - For soft deletes
- `initialAuditFields(context)` - For initial creation

#### UTC Timestamp Storage

- All dates stored in ISO 8601 format
- UTC timezone only
- Uses `@date-fns/utc` and `date-fns`
- Consistent formatting: `formatISO(new UTCDate())`

#### Dual Database Architecture

**Auth Database (`duitgee-auth`):**
- Users, sessions
- Organizations, teams
- Better Auth managed
- Configuration: `auth-drizzle.config.ts`
- Schema: `src/lib/server/db/better-auth-schema.ts` (auto-generated)

**App Database (`duitgee`):**
- Vaults, expenses, templates
- Business logic data
- Configuration: `drizzle.config.ts`
- Schema: `src/lib/server/db/schema.ts`

**Note:** Audit fields use string user IDs without foreign keys (microservice-friendly)

---

### 10. API Architecture

**Status:** ✅ Well-Structured

#### Framework

- **Hono** - Fast web framework
- **hono-openapi** - OpenAPI documentation
- **Valibot** - Request/response validation

#### Design Pattern

**RPC-Style with CQRS:**
- **Queries** (GET) - Read operations with query params
- **Commands** (POST) - Write operations with JSON body
- Action-oriented naming (e.g., `getVaults`, `createExpense`)

#### API Structure

```
/api
├── /auth/*           - Better Auth routes
├── /getVaults        - List vaults (GET)
├── /createVault      - Create vault (POST)
├── /getExpenses      - List expenses (GET)
├── /createExpense    - Create expense (POST)
├── ...
├── /openapi.json     - OpenAPI spec
└── /scalar           - API reference UI
```

**Base Router:** `src/lib/server/api/index.ts`
**Route Mounting:** `src/routes/[...path]/+server.ts` (catch-all)

#### Authentication Middleware

- All routes require authentication except `/api/auth/*`
- Session validation in middleware
- Current session available via `c.get('currentSession')`

#### Module Structure

Each API module follows:
1. Route definition: `*-api.ts` (e.g., `expenses-api.ts`)
2. Handler files: `*Handler.ts` for each operation
3. Schema file: `src/lib/schemas/*.ts` for validation

---

### 11. Development Tools

**Status:** ✅ Comprehensive Tooling

#### Testing

- **Unit Tests:** Vitest (Node environment)
- **E2E Tests:** Playwright (Browser environment)
- **Type Checking:** svelte-check with TypeScript

#### Database Tools

- **Drizzle Kit:** Schema migrations
- **Drizzle Studio:** Database GUI
- **Wrangler:** Cloudflare D1 management

#### Commands

```bash
# Development
pnpm run dev                    # Start dev server
pnpm run build                  # Build for production
pnpm run preview                # Preview production build

# Testing
pnpm run test:unit              # Run unit tests
pnpm run test:e2e               # Run e2e tests
pnpm run check                  # Type check

# Database (Main)
pnpm run db:generate            # Generate migrations
pnpm run db:push                # Push schema changes
pnpm run db:studio              # Open Drizzle Studio

# Database (Auth)
pnpm dlx @better-auth/cli@latest generate
pnpm drizzle-kit generate --config=auth-drizzle.config.ts

# Deployment
pnpm run deploy                 # Deploy to Cloudflare
wrangler deploy --env production
```

---

## Critical Gaps

### 1. Member Management ❌

**Priority:** 🔴 Critical
**Impact:** High - Core collaboration feature incomplete

#### Missing Features

- **Remove/Kick Member**
  - No API endpoint to remove members
  - No UI for member management
  - Members cannot leave vaults (except owner deleting)

- **Change Member Role**
  - Cannot promote member to admin
  - Cannot demote admin to member
  - Role permanently set at invitation

- **Member Dashboard**
  - No member list view with roles
  - No member activity/contribution tracking
  - Cannot see who has access

- **Leave Vault**
  - Non-owners cannot leave vaults
  - Must contact owner to be removed

#### Current State

- Invitations work ✅
- Role assignment at invite time ✅
- Permission enforcement ✅
- Post-invitation management ❌

#### Impact

Users who accept invitations are permanently stuck in vaults. Owners cannot remove inactive members or adjust permissions. Teams cannot adapt member roles as responsibilities change.

#### Suggested Implementation

**API Endpoints:**
```typescript
POST /api/removeMember
  Request: { vaultId, userId }
  Permission: canManageMembers

POST /api/updateMemberRole
  Request: { vaultId, userId, role }
  Permission: canManageMembers (owner for owner->admin change)

POST /api/leaveVault
  Request: { vaultId }
  Permission: Any member (except owner)
```

**UI Location:**
- Vault members page: `/vaults/[vaultId]/members`
- Member list with role badges
- Actions: Edit role, Remove (permission-gated)

**Files to Create:**
```
src/lib/server/api/vaults/removeMemberHandler.ts
src/lib/server/api/vaults/updateMemberRoleHandler.ts
src/lib/server/api/vaults/leaveVaultHandler.ts
src/routes/(auth)/vaults/[vaultId]/members/+page.svelte
src/routes/(auth)/vaults/[vaultId]/members/+page.server.ts
```

---

### 2. Receipt Attachments ❌

**Priority:** 🔴 Critical
**Impact:** High - Essential for expense verification

#### Missing Features

- **File Upload**
  - No receipt/photo upload capability
  - No attachment field in expense schema
  - No file storage integration

- **File Storage**
  - No Cloudflare R2 integration
  - No upload/download endpoints
  - No file size/type validation

- **Image Preview**
  - No image gallery/viewer
  - No thumbnail generation
  - No multiple attachments per expense

#### Current State

- Expenses have amount, note, category ✅
- No proof of expense ❌
- Cannot verify expenses ❌

#### Impact

Users cannot prove expenses with receipts. Essential for:
- Tax deductions
- Business expense reimbursement
- Shared vault accountability
- Expense auditing

Without receipts, the app is unsuitable for business use.

#### Suggested Implementation

**Database Schema:**
```typescript
// Add to expenses table
attachments: text('attachments', { mode: 'json' })
  .$type<{
    id: string;
    filename: string;
    filesize: number;
    contentType: string;
    url: string;
    uploadedAt: string;
  }[]>()
```

**API Endpoints:**
```typescript
POST /api/uploadReceipt
  Request: multipart/form-data
  Response: { id, url }

DELETE /api/deleteReceipt
  Request: { expenseId, attachmentId }
  Permission: canEditExpenses
```

**Storage:**
- Cloudflare R2 bucket for files
- Presigned URLs for downloads
- Image optimization/thumbnails

**UI Components:**
```
src/lib/components/ReceiptUpload.svelte
src/lib/components/ReceiptGallery.svelte
src/lib/components/ReceiptViewer.svelte
```

**Files to Modify:**
```
src/lib/server/db/schema.ts - Add attachments field
src/lib/schemas/expenses.ts - Add attachment validation
src/routes/(auth)/vaults/[vaultId]/expenses/new/+page.svelte - File upload UI
src/routes/(auth)/vaults/[vaultId]/expenses/[id]/edit/+page.svelte - File management
```

---

### 3. Recurring Expenses ❌

**Priority:** 🟠 High
**Impact:** High - Major time-saver for users

#### Missing Features

- **Recurring Patterns**
  - No configuration for repeated expenses
  - No automation/scheduling
  - Manual entry required for every occurrence

- **Supported Frequencies**
  - Daily (e.g., coffee)
  - Weekly (e.g., groceries)
  - Monthly (e.g., rent, subscriptions)
  - Yearly (e.g., insurance)
  - Custom intervals

- **Management**
  - No edit/pause/stop recurrence
  - No skip single occurrence
  - No end date or occurrence count

#### Current State

- Expense templates help ✅
- Still requires manual creation each time ❌
- No automation ❌

#### Impact

Users must manually create:
- Rent (monthly)
- Subscriptions (monthly)
- Utilities (monthly)
- Insurance (yearly)
- Regular groceries/coffee

This creates friction and risk of forgotten expenses.

#### Suggested Implementation

**Database Schema:**
```typescript
export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id').primaryKey(),
  vaultId: text('vault_id').notNull().references(() => vaults.id),
  name: text('name').notNull(),
  amount: text('amount').notNull(),
  category: text('category').notNull(),
  paymentType: text('payment_type').notNull(),
  paidBy: text('paid_by'), // nullable

  // Recurrence config
  frequency: text('frequency').notNull(), // daily, weekly, monthly, yearly, custom
  interval: integer('interval').default(1), // every N periods
  startDate: text('start_date').notNull(),
  endDate: text('end_date'), // nullable = indefinite
  nextDate: text('next_date').notNull(), // when to create next

  // Status
  status: text('status').notNull().default('active'), // active, paused, stopped

  // Audit
  ...auditFields
});
```

**API Endpoints:**
```typescript
POST /api/createRecurringExpense
GET /api/getRecurringExpenses?vaultId={id}
POST /api/updateRecurringExpense
POST /api/pauseRecurringExpense
POST /api/stopRecurringExpense
```

**Automation:**
- Cloudflare Workers cron trigger (daily)
- Check `nextDate` for due recurring expenses
- Auto-create expenses
- Update `nextDate` based on frequency

**UI Pages:**
```
/vaults/[vaultId]/recurring - List recurring expenses
/vaults/[vaultId]/recurring/new - Create recurring
/vaults/[vaultId]/recurring/[id]/edit - Edit recurring
```

---

### 4. Budget Management ❌

**Priority:** 🟠 High
**Impact:** High - Core personal finance feature

#### Missing Features

- **Budget Creation**
  - No budget configuration
  - No spending limits
  - No financial goals

- **Budget Types**
  - Overall vault budget
  - Per-category budgets
  - Per-member budgets

- **Budget Periods**
  - Monthly budgets
  - Quarterly budgets
  - Yearly budgets
  - Custom periods

- **Alerts & Notifications**
  - No overspending warnings
  - No threshold alerts (e.g., 80% spent)
  - No budget reset notifications

- **Budget Tracking**
  - No budget vs actual comparison
  - No visual progress indicators
  - No rollover of unused budget

#### Current State

- Can see total expenses ✅
- No spending limits ❌
- No budget goals ❌
- No alerts ❌

#### Impact

Users cannot:
- Set monthly spending limits
- Track against financial goals
- Get warned before overspending
- Control category-specific spending

Essential feature for personal finance management.

#### Suggested Implementation

**Database Schema:**
```typescript
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  vaultId: text('vault_id').notNull().references(() => vaults.id),

  // Budget config
  name: text('name').notNull(),
  amount: text('amount').notNull(),
  period: text('period').notNull(), // monthly, quarterly, yearly, custom

  // Scope
  categoryId: text('category_id'), // null = all categories
  userId: text('user_id'), // null = all members

  // Period dates
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),

  // Alerts
  alertThreshold: integer('alert_threshold').default(80), // percentage
  alertEnabled: integer('alert_enabled', { mode: 'boolean' }).default(true),

  // Status
  status: text('status').notNull().default('active'),

  // Audit
  ...auditFields
});
```

**API Endpoints:**
```typescript
POST /api/createBudget
GET /api/getBudgets?vaultId={id}
GET /api/getBudgetStatus?budgetId={id} // spent vs budget
POST /api/updateBudget
POST /api/deleteBudget
```

**Features:**
- Budget dashboard showing all budgets
- Visual progress bars (spent/remaining)
- Alert when threshold exceeded
- Monthly auto-reset for recurring budgets
- Budget recommendations based on spending history

**UI Pages:**
```
/vaults/[vaultId]/budgets - Budget dashboard
/vaults/[vaultId]/budgets/new - Create budget
/vaults/[vaultId]/budgets/[id]/edit - Edit budget
```

---

### 5. Export/Import Data ❌

**Priority:** 🟠 High
**Impact:** Medium - Data portability essential

#### Missing Features

- **Export Formats**
  - No CSV export
  - No Excel export (.xlsx)
  - No PDF reports
  - No JSON export

- **Export Scopes**
  - Cannot export all expenses
  - Cannot export filtered expenses
  - Cannot export date range
  - Cannot export templates

- **Import**
  - No CSV import
  - No migration from other apps
  - No bulk expense creation

- **Backup**
  - No vault backup
  - No data export for archival

#### Current State

- Data stored in database ✅
- No export capability ❌
- No import capability ❌
- Data locked in app ❌

#### Impact

Users cannot:
- Analyze data in Excel/Google Sheets
- Create custom reports
- Migrate from other expense apps
- Backup data for archival
- Share expenses with accountants

Data portability is essential for user trust.

#### Suggested Implementation

**API Endpoints:**
```typescript
GET /api/exportExpenses?vaultId={id}&format={csv|xlsx|pdf}&from={date}&to={date}
  Response: File download

POST /api/importExpenses
  Request: multipart/form-data (CSV file)
  Response: { imported: 10, errors: [...] }
```

**Export Features:**
- CSV: Simple format for Excel/Sheets
- XLSX: Formatted Excel with formulas
- PDF: Printable report with vault branding

**Import Features:**
- CSV parsing with validation
- Duplicate detection
- Error reporting (row-level)
- Preview before import
- Template import/export

**UI:**
- Export button on expenses page
- Format selector (CSV, Excel, PDF)
- Date range selector
- Import page with file upload
- Error review and correction

**Files to Create:**
```
src/lib/server/api/export/exportExpensesHandler.ts
src/lib/server/api/import/importExpensesHandler.ts
src/lib/server/utils/csvExport.ts
src/lib/server/utils/excelExport.ts
src/lib/server/utils/pdfExport.ts
src/routes/(auth)/vaults/[vaultId]/import/+page.svelte
```

---

### 6. Advanced Search & Filters ❌

**Priority:** 🟡 Medium
**Impact:** High for large datasets

#### Missing Features

- **Search**
  - No search by note/description
  - No full-text search
  - No search by amount

- **Advanced Filters**
  - Cannot filter by payment type
  - Cannot filter by amount range
  - Cannot multi-select categories
  - No combined filters

- **Filter UX**
  - No saved filter presets
  - No filter chips showing active filters
  - No clear all filters
  - No search suggestions

#### Current State

**Available Filters:**
- Date range (from/to) ✅
- Single category ✅
- Multiple members ✅

**Missing:**
- Search ❌
- Payment type filter ❌
- Amount range ❌
- Multi-category ❌

#### Impact

As expense data grows, finding specific expenses becomes difficult. Users need:
- "Find all coffee expenses over $5"
- "Show all credit card expenses this month"
- "Search for 'taxi' in notes"

Without search, user must scroll through paginated lists.

#### Suggested Implementation

**API Endpoint:**
```typescript
GET /api/searchExpenses?vaultId={id}&q={query}&filters={...}
  Params:
    - q: Search term (note, amount)
    - categories: Array of category IDs
    - paymentTypes: Array of payment types
    - amountMin, amountMax: Amount range
    - from, to: Date range
    - memberIds: Array of member IDs
```

**Features:**
- Full-text search on note field
- Debounced search input (300ms)
- Filter chips for active filters
- Saved filter presets (localStorage or DB)
- Filter combinations (AND logic)

**UI Enhancements:**
```typescript
// Enhanced filter drawer
<ExpenseFilters>
  <SearchInput placeholder="Search notes..." />
  <CategoryMultiSelect />
  <PaymentTypeSelect />
  <AmountRangeInput />
  <DateRangePicker />
  <MemberMultiSelect />
  <SaveFilterPreset />
</ExpenseFilters>

// Active filter chips
<FilterChips>
  {#each activeFilters as filter}
    <Chip onRemove={() => removeFilter(filter)}>
      {filter.label}
    </Chip>
  {/each}
</FilterChips>
```

**Files to Modify:**
```
src/lib/server/api/expenses/getExpensesHandler.ts - Add search logic
src/routes/(auth)/vaults/[vaultId]/ExpenseFilters.svelte - Add filters
src/lib/components/ui/filter-chips/ - New component
```

---

### 7. Invitation Management ❌

**Priority:** 🟡 Medium
**Impact:** Medium - UX improvement

#### Missing Features

- **Cancel Invitation**
  - Cannot revoke pending invitations
  - Invitations remain forever if not accepted

- **Resend Invitation**
  - No way to resend invitation email
  - User must create new invitation

- **Invitation Expiry**
  - No expiration date
  - Stale invitations accumulate

- **Invitation History**
  - Cannot see declined invitations
  - No audit trail of who was invited when

#### Current State

- Create invitation ✅
- Accept/decline invitation ✅
- View pending/sent ✅
- Cancel invitation ❌
- Resend invitation ❌
- Expiry ❌

#### Impact

Invitations sent to wrong email cannot be cancelled. No way to clean up old pending invitations. No notification when invitation is declined.

#### Suggested Implementation

**API Endpoints:**
```typescript
POST /api/cancelInvitation
  Request: { invitationId }
  Permission: Invitation creator or vault owner

POST /api/resendInvitation
  Request: { invitationId }
  Permission: Invitation creator or vault owner
```

**Database Changes:**
```typescript
// Add to invitations table
expiresAt: text('expires_at'), // 7 days from created
cancelledAt: text('cancelled_at'),
cancelledBy: text('cancelled_by')
```

**Features:**
- Cancel button on sent invitations
- Resend button (with rate limiting)
- Auto-expire after 7 days
- Email notification on accept/decline
- Invitation history page

**Files to Modify:**
```
src/lib/server/db/schema.ts - Add expiry fields
src/lib/server/api/invitations/cancelInvitationHandler.ts - New
src/lib/server/api/invitations/resendInvitationHandler.ts - New
src/routes/(auth)/invitations/+page.svelte - Add cancel/resend buttons
```

---

### 8. Bulk Operations ❌

**Priority:** 🟡 Medium
**Impact:** Medium - Efficiency for power users

#### Missing Features

- **Bulk Select**
  - No checkbox selection on expenses
  - Cannot select all/deselect all
  - No select by filter

- **Bulk Actions**
  - Cannot bulk delete expenses
  - Cannot bulk edit (change category, payment type)
  - Cannot bulk export selected

- **Confirmation**
  - No bulk action confirmations
  - Risk of accidental bulk delete

#### Current State

- One-by-one operations only
- No selection UI ❌
- No bulk actions ❌

#### Impact

Users with many expenses must:
- Delete expenses one-by-one
- Edit expenses individually
- No efficient cleanup of old data

Essential for users with hundreds/thousands of expenses.

#### Suggested Implementation

**API Endpoints:**
```typescript
POST /api/bulkDeleteExpenses
  Request: { vaultId, expenseIds: string[] }
  Permission: canDeleteExpenses

POST /api/bulkUpdateExpenses
  Request: { vaultId, expenseIds: string[], updates: {...} }
  Permission: canEditExpenses
```

**UI Components:**
```svelte
<ExpenseList>
  <SelectionBar>
    <Checkbox onCheck={selectAll} />
    <span>{selectedCount} selected</span>
    <Button onClick={bulkDelete}>Delete</Button>
    <Button onClick={bulkEdit}>Edit</Button>
    <Button onClick={bulkExport}>Export</Button>
  </SelectionBar>

  {#each expenses as expense}
    <ExpenseRow>
      <Checkbox bind:checked={expense.selected} />
      <!-- expense content -->
    </ExpenseRow>
  {/each}
</ExpenseList>
```

**Features:**
- Checkbox column on expense list
- Selection count indicator
- Bulk action bar (appears when items selected)
- Confirmation dialog for destructive actions
- Undo capability (soft delete allows restore)

**Files to Create:**
```
src/lib/server/api/expenses/bulkDeleteExpensesHandler.ts
src/lib/server/api/expenses/bulkUpdateExpensesHandler.ts
src/lib/components/BulkActionBar.svelte
```

---

### 9. Notification System ❌

**Priority:** 🟡 Medium
**Impact:** Medium - Collaboration awareness

#### Missing Features

- **In-App Notifications**
  - No notification center/dropdown
  - Only invitation badge exists
  - No notification history

- **Email Notifications**
  - No email on invitation
  - No email on expense edits
  - No email on member added/removed

- **Notification Types**
  - Vault invitations
  - Expense created/edited/deleted
  - Member added/removed/role changed
  - Budget alerts
  - Recurring expense creation

- **Notification Preferences**
  - No opt-in/opt-out per type
  - No frequency settings (instant, daily digest)
  - No do-not-disturb mode

#### Current State

- Toast notifications (ephemeral) ✅
- Invitation badge ✅
- No notification center ❌
- No email notifications ❌
- No preferences ❌

#### Impact

Users don't know when:
- Someone edits their expense
- New member joins vault
- Budget is exceeded
- Invitation is declined

Poor collaboration awareness.

#### Suggested Implementation

**Database Schema:**
```typescript
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),

  // Notification content
  type: text('type').notNull(), // invitation, expense_edit, member_added, etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'), // Link to related resource

  // Metadata
  relatedVaultId: text('related_vault_id'),
  relatedExpenseId: text('related_expense_id'),

  // Status
  read: integer('read', { mode: 'boolean' }).default(false),
  readAt: text('read_at'),

  createdAt: text('created_at').notNull()
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id').primaryKey(),

  // Email preferences
  emailOnInvitation: integer('email_on_invitation', { mode: 'boolean' }).default(true),
  emailOnExpenseEdit: integer('email_on_expense_edit', { mode: 'boolean' }).default(true),
  emailOnMemberChange: integer('email_on_member_change', { mode: 'boolean' }).default(true),
  emailOnBudgetAlert: integer('email_on_budget_alert', { mode: 'boolean' }).default(true),

  // Frequency
  emailFrequency: text('email_frequency').default('instant'), // instant, daily, weekly

  updatedAt: text('updated_at').notNull()
});
```

**API Endpoints:**
```typescript
GET /api/getNotifications?limit={10}&offset={0}
POST /api/markNotificationRead
POST /api/markAllNotificationsRead
GET /api/getNotificationPreferences
POST /api/updateNotificationPreferences
```

**Features:**
- Notification bell icon in header (with unread count)
- Dropdown showing recent notifications
- Mark as read/unread
- Click to navigate to related resource
- Notification preferences page
- Email notifications via `mailService.ts`

**Files to Create:**
```
src/lib/server/db/schema.ts - Add tables
src/lib/server/api/notifications/ - Handlers
src/lib/server/utils/notificationService.ts - Notification creation
src/lib/components/NotificationDropdown.svelte
src/routes/(auth)/settings/notifications/+page.svelte
```

---

### 10. Enhanced Reporting ❌

**Priority:** 🟡 Medium
**Impact:** Medium - Better insights

#### Missing Features

- **Charts & Visualizations**
  - No pie charts (category breakdown)
  - No line charts (spending over time)
  - No bar charts (member comparison)
  - Text-only statistics

- **Trend Analysis**
  - No month-over-month comparison
  - No year-over-year comparison
  - No spending trends
  - No predictions/forecasts

- **Custom Reports**
  - No report builder
  - No saved report templates
  - No scheduled reports (email)

- **Insights**
  - No spending pattern detection
  - No anomaly detection (unusual expenses)
  - No recommendations
  - No top categories/templates

#### Current State

**Available:**
- Total amount/count ✅
- Breakdown by template, category, member ✅
- Date range filtering ✅

**Missing:**
- Visual charts ❌
- Trends ❌
- Comparisons ❌
- Insights ❌

#### Impact

Users get raw numbers but no insights. Cannot easily:
- See spending trends over time
- Compare months/years
- Identify spending patterns
- Make data-driven decisions

#### Suggested Implementation

**Chart Library:**
- Chart.js or Recharts for React/Svelte
- Responsive charts
- Interactive tooltips
- Export chart as image

**Chart Types:**
```typescript
// Pie Chart - Category breakdown
<PieChart data={categoryBreakdown} />

// Line Chart - Spending over time
<LineChart
  data={monthlySpending}
  xAxis="month"
  yAxis="amount"
  comparison={previousYear} // overlay
/>

// Bar Chart - Member comparison
<BarChart data={memberSpending} />

// Stacked Bar Chart - Category by month
<StackedBarChart data={categoryMonthly} />
```

**Comparison Mode:**
```typescript
// API endpoint
GET /api/getVaultStatisticsComparison?
  vaultId={id}&
  from={date1}&to={date2}&
  compareFrom={date3}&compareTo={date4}

// Returns:
{
  current: { total, breakdown },
  previous: { total, breakdown },
  change: {
    percentage: "+15%",
    amount: "$150",
    trend: "up"
  }
}
```

**Insights Feature:**
```typescript
// AI-generated insights
- "Your food spending increased 25% this month"
- "You're spending more on weekends"
- "Top category: Restaurants (35% of total)"
- "Coffee expenses: 15 times this month (avg $4.50)"
```

**Custom Reports:**
- Report builder with drag-drop
- Save report templates
- Schedule email delivery (daily, weekly, monthly)
- Export report as PDF

**Files to Create:**
```
src/lib/components/charts/PieChart.svelte
src/lib/components/charts/LineChart.svelte
src/lib/components/charts/BarChart.svelte
src/lib/server/api/statistics/getComparisonHandler.ts
src/lib/server/utils/insights.ts
src/routes/(auth)/vaults/[vaultId]/reports/+page.svelte
```

---

## Feature Suggestions

### High Priority (Essential)

#### 1. Member Management Dashboard

**Description:** Complete member lifecycle management

**Features:**
- View all vault members with roles
- Remove/kick members
- Change member roles (promote/demote)
- Leave vault (for non-owners)
- Transfer ownership
- Member activity log

**Why Essential:**
- Core collaboration feature
- Currently incomplete
- Blocks team workflows

**Implementation Complexity:** Low (3-5 days)

**API Endpoints:**
```typescript
GET /api/getVaultMembers?vaultId={id}
POST /api/removeMember
POST /api/updateMemberRole
POST /api/leaveVault
POST /api/transferOwnership
```

**UI Pages:**
- `/vaults/[vaultId]/members` - Member management page

---

#### 2. Receipt Attachments

**Description:** Upload and manage expense receipts/photos

**Features:**
- Multi-file upload (JPG, PNG, PDF)
- Cloudflare R2 storage
- Image preview/gallery
- Thumbnail generation
- Download receipts
- Multiple attachments per expense

**Why Essential:**
- Proof of expenses
- Tax documentation
- Business reimbursement
- Audit trail

**Implementation Complexity:** Medium (5-7 days)

**Storage:**
- Cloudflare R2 bucket
- Presigned URLs for secure access
- Image optimization

---

#### 3. Recurring Expenses

**Description:** Automate repeated expenses

**Features:**
- Configure recurrence (daily, weekly, monthly, yearly)
- Auto-generate expenses on schedule
- Edit/pause/stop recurrence
- Skip single occurrence
- End date or occurrence count
- Recurrence history

**Why Essential:**
- Save time on manual entry
- Never miss regular expenses
- Essential for subscriptions, rent, bills

**Implementation Complexity:** Medium (5-7 days)

**Automation:**
- Cloudflare Workers cron (daily check)
- Auto-create expenses
- Update next occurrence date

---

#### 4. Budget Tracking

**Description:** Set spending limits and track against goals

**Features:**
- Create budgets (vault, category, member-scoped)
- Budget periods (monthly, quarterly, yearly)
- Alert thresholds (e.g., 80% spent)
- Visual progress indicators
- Budget vs actual comparison
- Rollover unused budget
- Budget recommendations

**Why Essential:**
- Core personal finance feature
- Spending control
- Financial goals
- Overspending prevention

**Implementation Complexity:** Medium (5-7 days)

**Alerts:**
- Email when threshold reached
- Toast notification on budget page
- Dashboard widget showing budget status

---

#### 5. Advanced Search & Filters

**Description:** Find expenses quickly and efficiently

**Features:**
- Full-text search on notes
- Filter by payment type
- Filter by amount range
- Multi-select categories
- Combined filters (AND logic)
- Saved filter presets
- Active filter chips

**Why Essential:**
- Usability with large datasets
- Find specific expenses quickly
- Essential for tax preparation
- Power user efficiency

**Implementation Complexity:** Low (3-5 days)

**Search Algorithm:**
- SQLite FTS5 for full-text search
- Indexed fields: note, category, amount
- Debounced search (300ms)

---

### Medium Priority (Enhanced UX)

#### 6. Export/Import Features

**Description:** Data portability and external analysis

**Features:**
- Export to CSV, Excel, PDF
- Import from CSV with validation
- Template export/import
- Vault backup
- Custom export fields
- Date range export

**Why Important:**
- Data ownership
- External tools (Excel, Sheets)
- Tax software integration
- Migration from other apps

**Implementation Complexity:** Medium (4-6 days)

**Libraries:**
- `xlsx` for Excel generation
- `pdfkit` for PDF reports
- `csv-parse` for import validation

---

#### 7. Enhanced Charts & Analytics

**Description:** Visual insights into spending patterns

**Features:**
- Pie charts (category breakdown)
- Line charts (spending over time)
- Bar charts (member comparison)
- Stacked charts (category by month)
- Month-over-month comparison
- Year-over-year trends
- Spending predictions

**Why Important:**
- Better financial insights
- Data-driven decisions
- Visual understanding
- Trend identification

**Implementation Complexity:** Medium (4-6 days)

**Chart Library:**
- Chart.js or Recharts
- Responsive and interactive
- Export as image

---

#### 8. Notification Center

**Description:** Stay informed of vault activities

**Features:**
- In-app notification dropdown
- Email notifications
- Notification preferences
- Mark as read/unread
- Notification history
- Action links (deep links to resources)

**Why Important:**
- Collaboration awareness
- Timely alerts
- User engagement
- Better UX

**Implementation Complexity:** Medium (4-6 days)

**Notification Types:**
- Vault invitations
- Expense edits
- Member changes
- Budget alerts

---

#### 9. Bulk Operations

**Description:** Efficient management of multiple expenses

**Features:**
- Checkbox selection
- Select all/deselect all
- Bulk delete
- Bulk edit (category, payment type)
- Bulk export
- Confirmation dialogs

**Why Important:**
- Power user efficiency
- Cleanup old data
- Mass categorization
- Time-saving

**Implementation Complexity:** Low (2-4 days)

---

#### 10. Smart Expense Entry

**Description:** Faster expense creation

**Features:**
- Quick-add FAB on vault page
- Duplicate last expense
- Smart defaults (learns patterns)
- Template suggestions
- Voice input (amount, note)
- Keyboard shortcuts

**Why Important:**
- Reduce friction
- Increase adoption
- Daily use optimization
- Mobile-friendly

**Implementation Complexity:** Low (3-5 days)

**Smart Defaults:**
- Time: Last expense time
- Category: Most used category
- Payment: Most used payment type
- Member: Current user

---

### Advanced Features (Nice to Have)

#### 11. Split Expenses

**Description:** Divide expenses among members

**Features:**
- Split equally
- Split by percentage
- Custom split amounts
- Track who owes whom
- Settlement tracking
- "Settle up" feature
- Split history

**Use Cases:**
- Roommate shared expenses
- Group trips
- Dinner bills
- Shared subscriptions

**Implementation Complexity:** High (7-10 days)

**Settlement Logic:**
- Calculate net balances
- Suggest optimal settlements
- Record payments
- Update balances

---

#### 12. Tags System

**Description:** Flexible categorization beyond categories

**Features:**
- Create custom tags
- Tag colors
- Auto-suggest tags
- Tag-based filtering
- Tag cloud view
- Tag statistics

**Use Cases:**
- Project tracking (#project-x)
- Location (#new-york)
- Events (#vacation-2025)
- Tax categories (#deductible)

**Implementation Complexity:** Medium (4-6 days)

---

#### 13. Multi-Currency Expenses

**Description:** Track foreign currency expenses

**Features:**
- Currency per expense (override vault default)
- Currency conversion API
- Historical exchange rates
- Dual display (original + vault currency)
- Exchange rate tracking

**Use Cases:**
- International travelers
- Multi-country teams
- Freelancers with foreign clients
- Import businesses

**Implementation Complexity:** Medium (5-7 days)

**Currency API:**
- Fixer.io or ExchangeRate-API
- Daily rate updates
- Historical rate storage

---

#### 14. Mobile App

**Description:** Native mobile experience

**Features:**
- React Native or Flutter
- Offline-first architecture
- Camera for receipts
- Push notifications
- GPS location tagging
- Biometric auth
- Widget support

**Why Important:**
- Better mobile UX
- Offline support
- Camera integration
- Push notifications

**Implementation Complexity:** Very High (8-12 weeks)

---

#### 15. Integrations

**Description:** Automate expense tracking

**Integrations:**
- Bank accounts (Plaid, Yodlee)
- Credit cards (auto-import)
- Email receipt parsing (Gmail API)
- Calendar (recurring expenses)
- Slack/Discord (notifications)
- Zapier/Make (automation)

**Why Important:**
- Reduce manual entry
- Automation
- Real-time tracking
- Ecosystem connectivity

**Implementation Complexity:** Very High (varies by integration)

---

#### 16. AI Features

**Description:** Intelligent expense management

**Features:**
- Receipt OCR (extract amount, vendor, date)
- Smart categorization (AI-suggested categories)
- Anomaly detection (unusual expenses)
- Spending insights and recommendations
- Natural language queries ("How much did I spend on food last month?")
- Expense predictions

**Implementation Complexity:** Very High (8-12 weeks)

**Technologies:**
- Claude API for NLP
- Tesseract OCR for receipts
- ML models for categorization

---

#### 17. Shared Expense Settlements

**Description:** Simplify who-owes-whom

**Features:**
- Balance calculation (who owes whom)
- Optimal settlement suggestions
- Payment recording
- Payment history
- Venmo/PayPal integration
- Settlement reminders

**Use Cases:**
- Roommates splitting rent/utilities
- Friend groups (dinners, trips)
- Couples sharing expenses

**Implementation Complexity:** High (7-10 days)

---

#### 18. Custom Categories

**Description:** User-defined categories

**Features:**
- Create custom categories
- Custom icons and colors
- Category hierarchy (subcategories)
- Default categories + custom
- Category templates
- Import/export categories

**Why Important:**
- Flexibility
- Industry-specific needs
- Personal preferences

**Implementation Complexity:** Medium (4-6 days)

**Migration:**
- Move categories from config to DB
- Seed default categories
- Per-vault custom categories

---

#### 19. Expense Approvals

**Description:** Approval workflow for expenses

**Features:**
- Submit expense for approval
- Approve/reject expenses
- Approval rules (e.g., >$100 needs approval)
- Approval notifications
- Approval history

**Use Cases:**
- Business expense reports
- Team spending control
- Manager oversight

**Implementation Complexity:** Medium (5-7 days)

**Workflow:**
```
Created → Pending Approval → Approved/Rejected
```

---

#### 20. Audit Logs

**Description:** Comprehensive activity tracking

**Features:**
- Log all vault/expense changes
- Who did what when
- Change history (before/after)
- Audit log export
- Retention policy

**Use Cases:**
- Compliance
- Dispute resolution
- Security monitoring
- Team accountability

**Implementation Complexity:** Medium (4-6 days)

**Schema:**
```typescript
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  vaultId: text('vault_id'),
  action: text('action').notNull(), // created, updated, deleted
  entityType: text('entity_type').notNull(), // expense, vault, member
  entityId: text('entity_id').notNull(),
  changes: text('changes', { mode: 'json' }), // before/after
  createdAt: text('created_at').notNull()
});
```

---

## Implementation Roadmap

### Phase 1: Critical Gaps (4-6 weeks)

**Goal:** Complete core features for production readiness

**Features:**
1. Member Management Dashboard (1 week)
   - Remove/kick members
   - Change member roles
   - Leave vault
   - Member list page

2. Receipt Attachments (1 week)
   - Cloudflare R2 integration
   - File upload/download
   - Image preview
   - Multiple attachments

3. Recurring Expenses (1 week)
   - Database schema
   - Cron automation
   - Create/edit/delete UI
   - Recurrence patterns

4. Budget Tracking (1 week)
   - Budget CRUD
   - Budget dashboard
   - Alert system
   - Progress indicators

5. Advanced Search & Filters (1 week)
   - Full-text search
   - Enhanced filters
   - Saved presets
   - Filter chips

**Deliverables:**
- Feature-complete expense tracker
- Production-ready collaboration
- Essential personal finance features

---

### Phase 2: Enhanced UX (4-6 weeks)

**Goal:** Improve user experience and data portability

**Features:**
1. Export/Import (1 week)
   - CSV/Excel/PDF export
   - CSV import
   - Template export

2. Charts & Analytics (1 week)
   - Chart.js integration
   - Pie/line/bar charts
   - Trend analysis
   - Comparisons

3. Notification Center (1 week)
   - In-app notifications
   - Email notifications
   - Notification preferences

4. Bulk Operations (0.5 week)
   - Checkbox selection
   - Bulk delete/edit
   - Confirmation dialogs

5. Smart Expense Entry (0.5 week)
   - Quick-add FAB
   - Duplicate last
   - Smart defaults

6. Invitation Management (1 week)
   - Cancel/resend invitations
   - Invitation expiry
   - History

**Deliverables:**
- Improved UX
- Better insights
- Power user features

---

### Phase 3: Advanced Features (6-8 weeks)

**Goal:** Differentiation and advanced capabilities

**Features:**
1. Split Expenses (2 weeks)
   - Split logic
   - Settlement tracking
   - "Settle up" feature

2. Tags System (1 week)
   - Tag CRUD
   - Tag filtering
   - Tag statistics

3. Multi-Currency (1 week)
   - Currency API
   - Per-expense currency
   - Conversion tracking

4. Custom Categories (1 week)
   - Move to database
   - Custom category CRUD
   - Category hierarchy

5. Audit Logs (1 week)
   - Comprehensive logging
   - Audit viewer
   - Export logs

**Deliverables:**
- Advanced collaboration
- Flexible categorization
- Compliance features

---

### Phase 4: Ecosystem (8-12 weeks)

**Goal:** Integrations and mobile

**Features:**
1. Mobile App (8-10 weeks)
   - React Native development
   - Offline sync
   - Camera integration
   - Push notifications

2. Integrations (2-4 weeks)
   - Bank account (Plaid)
   - Email receipt parsing
   - Zapier/Make

3. AI Features (varies)
   - Receipt OCR
   - Smart categorization
   - Insights

**Deliverables:**
- Native mobile experience
- Automated tracking
- AI-powered features

---

## Technical References

### Key Files

**Database Schema:**
- `src/lib/server/db/schema.ts` - Main app schema
- `src/lib/server/db/better-auth-schema.ts` - Auth schema (auto-generated)

**API Routes:**
- `src/lib/server/api/index.ts` - API router
- `src/lib/server/api/vaults/*` - Vault endpoints
- `src/lib/server/api/expenses/*` - Expense endpoints
- `src/lib/server/api/expense-templates/*` - Template endpoints
- `src/lib/server/api/invitations/*` - Invitation endpoints

**Validation Schemas:**
- `src/lib/schemas/*.ts` - Valibot schemas

**Utilities:**
- `src/lib/server/utils/vaultPermissions.ts` - Permission checks
- `src/lib/server/utils/audit.ts` - Audit field helpers
- `src/lib/utils.ts` - DateTime utilities

**UI Pages:**
- `src/routes/(auth)/vaults/` - Vault pages
- `src/routes/(auth)/invitations/` - Invitations
- `src/routes/(auth)/settings/` - User settings

**Components:**
- `src/lib/components/ui/*` - shadcn-svelte components
- `src/lib/components/*` - Custom components

**Configuration:**
- `src/lib/configurations/categories.ts` - Categories
- `src/lib/configurations/currencies.ts` - Currencies
- `src/lib/configurations/locales.ts` - Locales
- `src/lib/configurations/payment-types.ts` - Payment types

---

### Development Commands

```bash
# Development
pnpm run dev                    # Start dev server

# Database (Main)
pnpm run db:generate            # Generate migrations
pnpm run db:push                # Push schema changes
wrangler d1 migrations apply "duitgee-app"  # Apply migrations

# Database (Auth)
pnpm dlx @better-auth/cli@latest generate
pnpm drizzle-kit generate --config=auth-drizzle.config.ts
wrangler d1 migrations apply "duitgee-app-auth"

# Testing
pnpm run test:unit              # Unit tests
pnpm run test:e2e               # E2E tests
pnpm run check                  # Type check

# Deployment
pnpm run deploy                 # Deploy to Cloudflare
```

---

### Architecture Notes

**Dual Database:**
- `duitgee-auth` - Authentication (Better Auth)
- `duitgee` - Application data

**RPC-Style API:**
- Queries: GET with query params
- Commands: POST with JSON body
- Action-oriented naming

**Permission Model:**
- Role-based (owner, admin, member)
- Permission utilities enforce access
- All handlers check permissions

**Audit Pattern:**
- All tables track created/updated/deleted
- Soft delete everywhere
- Audit utilities provide helpers

**DateTime:**
- Store UTC (ISO 8601)
- Display local
- Utilities handle conversion

---

## Conclusion

DuitGee has a **solid foundation** with comprehensive expense tracking, vault management, and collaboration features. The application demonstrates good architectural patterns (dual DB, RPC-style API, permission system, audit trail).

### Strengths
- ✅ Robust expense CRUD with templates
- ✅ Role-based vault permissions
- ✅ Multi-currency and multi-locale support
- ✅ Clean API architecture with validation
- ✅ Soft delete and audit trail
- ✅ Modern tech stack (SvelteKit, Cloudflare, Better Auth)

### Key Gaps to Address
1. **Member Management** - Complete the collaboration lifecycle
2. **Receipt Attachments** - Essential for expense verification
3. **Recurring Expenses** - Eliminate manual entry friction
4. **Budget Tracking** - Core personal finance feature
5. **Advanced Search** - Usability with large datasets

### Recommended Next Steps

**Immediate (Phase 1 - 4-6 weeks):**
1. Implement member management dashboard
2. Add receipt attachments with R2 storage
3. Build recurring expense automation
4. Create budget tracking system
5. Enhance search and filters

**Short-term (Phase 2 - 4-6 weeks):**
1. Add export/import features
2. Implement charts and analytics
3. Build notification center
4. Add bulk operations
5. Improve expense entry UX

**Long-term (Phase 3-4 - 14-20 weeks):**
1. Advanced features (splits, tags, multi-currency)
2. Mobile app development
3. Integrations and automation
4. AI-powered features

Addressing the **critical gaps** will bring the application from **65% to 85% completeness** and make it competitive with established expense tracking solutions.

---

**Report Generated:** December 12, 2025
**Analysis Tool:** Claude Code + Explore Agent
**Codebase Version:** Latest (master branch)