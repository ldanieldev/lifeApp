# Car Maintenance Manager - Feature Design

## Overview

A simplified car maintenance tracking web application for managing service history, costs, and maintenance reminders across multiple vehicles. Inspired by LubeLogger but intentionally streamlined to focus on core functionality.

## Core Features

### Vehicle Management

- User can add multiple vehicles to their account
- Two methods to add a vehicle:
  - **VIN lookup** - Decodes VIN to auto-populate year, make, model, engine, etc.
  - **Manual entry** - User enters year, make, model manually
- When a vehicle is added, app attempts to fetch recommended maintenance schedule from an API (if available) to pre-populate reminders
- User can accept, modify, or skip the suggested reminders
- Each vehicle tracks:
  - Basic info (year, make, model, VIN if provided)
  - Current odometer reading (updated via periodic prompts)
  - Photo (optional)

**Odometer Tracking:**
- Mileage entered when adding service records
- App periodically prompts "What's your current mileage?" to keep estimates accurate for reminder calculations

---

### Dashboard

Single-vehicle focus view showing status and financial insights.

**Vehicle selector:**
- Dropdown or tabs to switch between vehicles
- Shows vehicle name/photo for quick identification

**Status section (for selected vehicle):**
- Current odometer (with "update" prompt if stale)
- Upcoming reminders (next 2-3 items due)
- Overdue reminders (highlighted/urgent)
- Most recent service record

**Financial charts:**
- Repair cost per month - Bar chart showing monthly spending over time
- Cost of ownership per year - Annual total (or running total for current year)
- Total spent to date - Lifetime spending on this vehicle

**Quick actions:**
- Add service record
- Add note
- Update odometer

---

### Service Records

Single unified log for all maintenance and repairs performed on a vehicle.

**Each service record captures:**
- Date of service
- Odometer reading at time of service
- Service type (oil change, brakes, tires, inspection, etc.)
- Cost breakdown:
  - Parts cost
  - Labor cost
  - Total (calculated)
- Location (select from saved shops or mark as DIY)
- Notes (free-form text)
- Attachments (photos of receipts, invoices, work performed)

**Service Types:**
- Predefined common types (oil change, tire rotation, brake pads, etc.)
- User can add custom service types

**DIY Support:**
- When location is marked "DIY", labor cost defaults to $0
- Parts cost still tracked for true cost comparison vs shop work

---

### Shop/Location Management

A unified list of service locations for quick selection when logging service records.

**Adding a shop:**
- **Google Maps lookup** - Search for a business, select from results, app saves:
  - Business name
  - Address
  - Phone number
  - Google Maps place ID (for "open in maps" functionality)
- **Manual entry** - User enters name, address, phone directly (for shops not on Google Maps)

**Shop list features:**
- All shops live in one list, regardless of how they were added
- Shops are shared across all vehicles (your go-to mechanic works on all your cars)
- When viewing a service record, tap the shop to open its location in Google Maps

**Special entries:**
- "DIY" is a built-in option, not a shop in the list
- User cannot delete a shop that has service records attached (or: records retain shop info even if shop is later deleted)

---

### Reminders

Track upcoming maintenance based on manufacturer recommendations or user preferences.

**Reminder structure:**
- Service type (oil change, tire rotation, etc.)
- Trigger condition: whichever comes first
  - Mileage interval (e.g., every 5,000 miles)
  - Time interval (e.g., every 6 months)
- Last completed date/mileage (auto-populated when a matching service record is added)
- Status: upcoming, due soon, overdue

**Initial setup:**
- When adding a vehicle, app attempts to fetch maintenance schedule from an API based on year/make/model or VIN
- User reviews suggested reminders and can accept, modify, or dismiss each
- If no API data available, user creates reminders manually

**Reminder lifecycle:**
- When a service record is logged that matches a reminder type, the reminder resets its "last completed" baseline
- App calculates next due date/mileage based on current odometer and driving patterns from periodic prompts

**Notifications:**
- Reminders integrate with a separate notification service via API
- User configures preferred notification method(s) in that system

---

### Notes (Vehicle Journal)

A chronological, timestamped log for observations, issues, and anything that doesn't fit in a service record.

**Note structure:**
- Timestamp (auto-generated when note is created)
- Content (free-form text)
- Optional: odometer reading at time of note
- Optional: image attachment (photo of issue, warning light, quote, etc.)

**Use cases:**
- "Squeaky sound from rear left when braking"
- "Dealer mentioned transmission fluid looks dark"
- "Check engine light came on, then went away" + photo of the dash light
- "Got a quote from Joe's Auto: $450 for brake job" + photo of written estimate

**Display:**
- Simple chronological list, newest first (or oldest first - user preference)
- Searchable by text content

No categories or tags - keeping it simple as a running journal.

---

## Data Model

### Entities

**User**
- id, email, password, preferences

**Vehicle**
- id, user_id, year, make, model, vin (optional), photo (optional), current_odometer, odometer_updated_at

**ServiceRecord**
- id, vehicle_id, date, odometer, service_type, parts_cost, labor_cost, location_id (nullable for DIY), notes, created_at

**ServiceRecordAttachment**
- id, service_record_id, file_path, file_name

**Shop**
- id, user_id, name, address, phone, google_place_id (optional)

**Reminder**
- id, vehicle_id, service_type, mileage_interval, time_interval_months, last_completed_date, last_completed_odometer

**Note**
- id, vehicle_id, content, odometer (optional), image_path (optional), created_at

**ServiceType** (lookup table)
- id, name, is_custom, user_id (nullable - null for system defaults)

---

## Technical Architecture

**Backend:**
- Django REST API
- PostgreSQL database

**Frontend:**
- React single-page application
- Responsive design for mobile browser support

**Supporting Services:**
- **Redis** - Session management, caching (e.g., API responses for maintenance schedules, frequently accessed data)
- **OpenSearch** - Indexing for search across:
  - Service records (search by service type, notes, shop name)
  - Notes (full-text search of journal entries)
  - Vehicles (for users with many vehicles)

**External Integrations:**
- Google Places API - Shop lookup and "open in maps" functionality
- Maintenance schedule API (TBD) - Pre-populate reminders on vehicle setup
- Notification service - Reminder alerts via API hook

**File Storage:**
- TBD: Local/S3 for receipt photos and note images

---

## Open Questions & Research Needed

### Maintenance Schedule API
- Need to research available APIs for manufacturer maintenance schedules
- Possible options to investigate:
  - NHTSA vehicle API (free, VIN decoding - may not include maintenance)
  - Carmd API (paid, includes maintenance schedules)
  - RepairPal API
  - Building a static dataset from manufacturer manuals as fallback
- Fallback: manual reminder creation always available

### Google Maps/Places Integration
- Will need Google Places API key for shop lookup
- Consider cost implications (Places API has per-request pricing)
- Alternative: let user enter address manually, just provide "open in Google Maps" link without lookup feature

### File Storage
- Attachments (receipts, photos) need storage solution
- Options: local filesystem, S3/cloud storage, database BLOBs
- Consider size limits per attachment and per user

---

## Out of Scope (for MVP)

- Multi-user sharing of vehicles
- Mobile native apps (web responsive only)
- Advanced analytics (cost per mile, shop comparison, projections)
- Fuel tracking
- Trip logging
