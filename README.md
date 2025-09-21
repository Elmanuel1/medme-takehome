# MedMe Scheduling Service

A robust appointment scheduling service with Google Calendar integration and AI-powered booking through Retell webhooks.

## 🚀 What This Project Does

The MedMe Scheduling Service provides AI-powered appointment management with:

- **Voice-Based Booking**: Integrates with Retell AI for natural language appointment scheduling
- **Google Calendar Integration**: Automatically syncs appointments with Google Calendar
- **Smart Conflict Detection**: Prevents double-booking with intelligent validation
- **Flexible Contact Management**: Supports appointments with email OR phone number
- **Business Rules Enforcement**: 2-hour cancellation policy and appointment type restrictions

### Core Features:
- ✅ Schedule appointments with conflict detection
- ✅ Reschedule appointments (date, time, type only)
- ✅ Cancel appointments (with 2-hour advance notice rule)
- ✅ Search active appointments by email or phone
- ✅ Real-time Google Calendar synchronization
- ✅ PostgreSQL database with data integrity constraints

## 🏗️ System Design

### Architecture Overview

The MedMe Scheduling Service is a microservice that provides appointment management functionality through webhook APIs. It integrates with AI platforms via function calling and manages appointment data with Google Calendar synchronization.

```mermaid
graph TB
    subgraph "AI Platform"
        A[Conversation Engine]
        B[Function Calling]
    end
    
    subgraph "MedMe Service"
        C[Webhook Handler]
        D[Business Logic]
        E[Data Repository]
        F[Calendar Service]
    end
    
    subgraph "External Services"
        G[Google Calendar API]
        H[PostgreSQL Database]
    end
    
    B <--> C
    D --> E
    D --> F
    E <--> H
    F <--> G
```

### Database Schema

The complete SQL schema with constraints and performance indexes:

```sql
-- Optional: needed for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  email text,
  phone_number text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  type text not null,
  status text not null default 'scheduled',
  notes jsonb not null default '{}',
  reason text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint appointments_time_range check (end_at > start_at),
  constraint appointments_unique_slot unique (start_at, end_at),
  constraint appointments_contact_required check (email is not null or phone_number is not null)
);

-- Performance indexes
create index if not exists idx_appointments_email on appointments (email);
create index if not exists idx_appointments_status on appointments (status);
create index if not exists idx_appointments_time_range on appointments (start_at, end_at);
create index if not exists idx_appointments_calendar_event on appointments (calendar_event_id);
create index if not exists idx_appointments_notes_gin on appointments using gin (notes);
```

### Core Design Patterns

#### Database-First Approach
The system creates database records before external API calls to ensure data consistency:

1. **Validate** - Check for conflicts and business rules
2. **Persist** - Create database record with generated ID  
3. **Synchronize** - Update external services with database ID
4. **Rollback** - Delete database record if external calls fail

#### Request Flow

```mermaid
sequenceDiagram
    participant Client as AI Platform
    participant Service as MedMe Service
    participant DB as Database
    participant Cal as Google Calendar

    Client->>Service: schedule_appointment(data)
    Service->>DB: Check for conflicts
    alt Conflicts found
        Service-->>Client: TimeSlotUnavailableError
    else Available
        Service->>DB: INSERT appointment
        Service->>Cal: Create calendar event
        alt Calendar success
            Service->>DB: UPDATE with event ID
            Service-->>Client: Success + appointment
        else Calendar failure
            Service->>DB: DELETE appointment
            Service-->>Client: Calendar error
        end
    end
```

### Business Rules
- Either email or phone number required for contact
- Appointment end time must be after start time
- No overlapping appointment time slots allowed
- Cancellation requires 2+ hours advance notice
- Only date, time, and type fields can be modified during reschedule

### Database Migrations
The project uses **Flyway** for database schema management:
- Version-controlled SQL migrations in `/sql` directory
- Automatic migration execution during Docker startup
- Migration naming: `V1__description.sql`, `V2__description.sql`, etc.
- Supports rollback and migration history tracking

## 🛠️ Prerequisites

- Node.js 18+
- Google Cloud Console access (for Calendar API)
- **Choose one database option:**
  - Local PostgreSQL installation, OR
  - Docker & Docker Compose (recommended)

## ⚙️ Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd medme-schedule
npm install
```

### 2. Google Calendar API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create a Service Account:
   - Go to IAM & Admin → Service Accounts
   - Create service account
   - Download the JSON key file
5. Share your Google Calendar with the service account email

### 3. Environment Variables
Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/medme_schedule

# Google Calendar API
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_PRIMARY_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_FREEBUSY_RANGE_DAYS=7
GOOGLE_TIMEZONE=America/New_York

# Retell Webhook Configuration
RETELL_WEBHOOK_SIGNING_KEY=your-retell-signing-key
```

### 4. Retell AI Agent Configuration

Upload the provided agent configuration to Retell AI:

1. **Access Retell AI Dashboard:**
   - Go to [Retell AI Dashboard](https://dashboard.retellai.com/)
   - Sign in to your account

2. **Import Agent Configuration:**
   - Navigate to "Agents" section
   - Click "Create Agent" or "Import Agent"
   - Upload the `retell.ai/Medical Center Receptionist New.json` file from this repository
   
3. **Configure Webhook Endpoint:**
   - The configuration already has the production URL: `https://medme-schedule-production.up.railway.app/retell-webhook`
   - For local testing, update the webhook URL in each tool to your ngrok tunnel:
   - Replace `https://medme-schedule-production.up.railway.app/retell-webhook` with `https://your-ngrok-url.ngrok-free.app/retell-webhook`

4. **Update Environment Variables:**
   - Copy the Retell webhook signing key from the dashboard
   - Update `RETELL_WEBHOOK_SIGNING_KEY` in your `.env` file

5. **Test Agent Functions:**
   - The agent is configured to call these functions:
     - `check_booked_slots` - Check appointment availability
     - `schedule_appointment` - Book new appointments
     - `get_active_appointments_by_email_or_phone` - Find existing appointments
     - `reschedule_appointment` - Update appointment details
     - `cancel_appointment` - Cancel appointments
     - `get_current_time` - Get current UTC time

**Note:** The agent configuration includes conversation flows for appointment booking, rescheduling, and cancellation with natural language processing optimized for medical receptionist interactions.

## 🔧 Development Options

### Option A: Docker Development (Recommended)
*Complete containerized environment with automatic migrations*

**Start Full Environment:**
```bash
# Start application, database, and run migrations
make docker-run
```

**Access Points:**
- Application: http://localhost:3002
- Database: localhost:5434
- Database migrations handled by Flyway automatically

### Option B: Local Development (Run App on Host)
*Run the Node.js application locally, use Docker for PostgreSQL only*

**Database Setup:**
```bash
# Start Docker PostgreSQL container
docker run --name medme-postgres \
  -e POSTGRES_DB=medme_schedule \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:14-alpine

# Run the schema using psql with connection details
psql -h localhost -p 5432 -U postgres -d medme_schedule < sql/V1__create_appointments_table.sql

# Update your .env file with the DATABASE_URL:
DATABASE_URL=postgresql://postgres:password@localhost:5432/medme_schedule

# Copy .env to .env.local for the development server:
cp .env .env.local
```

**Start Development:**
```bash
# Build the TypeScript code first
npm run build

# Start development server
npm run dev
```

**Testing During Development:**
```bash
# Run tests (uses Testcontainers for integration tests)
npm test

# Test individual components
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests (requires Docker)

# Test the built application
npm start                  # Run production build locally
curl http://localhost:3000/health  # Verify health endpoint
```

## 🧪 Testing

```bash
# Run all tests
make test
```

## 🚀 Production Deployment

### Docker Hub
```bash
# Pull and run latest image
docker pull oluwatoba/medme-schedule:latest
docker run -p 3000:3000 --env-file .env oluwatoba/medme-schedule:latest

# Or use full Docker Compose stack
docker-compose up -d
```

### Available Commands
```bash
# Development
npm run dev          # Development server with hot reload
npm run build        # Build TypeScript to JavaScript  
npm start            # Production server

# Docker
make docker-run      # Build and run with Docker Compose
make run            # Build and run locally
```

## 📡 API Reference

### Endpoints
- `POST /retell-webhook` - Handles Retell AI function calls
- `GET /health` - Service health check

### Supported Retell Functions
- `schedule_appointment` - Book a new appointment
- `reschedule_appointment` - Modify appointment (date/time/type only)
- `cancel_appointment` - Cancel appointment (2+ hours in advance)
- `check_booked_slots` - Get availability for specific date
- `get_active_appointments_by_email_or_phone` - Search active appointments
- `get_current_time` - Get current UTC time

## 🗄️ Database Schema

PostgreSQL database with the following constraints:
- **Contact Required**: Either email OR phone number must be provided
- **Time Validation**: End time must be after start time
- **Unique Time Slots**: No overlapping appointments
- **Data Integrity**: Names limited to 150 characters, JSONB notes structure

## 🔒 Security

- Retell webhook signature verification
- Google Calendar service account authentication
- Database connection pooling with error handling
- Robust input validation

## 🚧 Areas for Improvement

Due to time constraints, the following enhancements would significantly improve the system:

### 1. **Knowledge Base Integration**
- **Vector Database**: Implement PostgreSQL with pgvector extension for semantic search
- **Appointment Intelligence**: Store and retrieve appointment patterns, frequently asked questions, and medical terminology
- **Smart Suggestions**: Use embeddings to suggest appointment types based on patient descriptions

### 2. **CI/CD Pipeline**
- **Automated Deployments**: GitHub Actions for production deployments
- **Database Migrations**: Automated Flyway script execution in staging/production environments
- **Testing Pipeline**: Automated unit, integration, and end-to-end testing
- **Docker Registry**: Automated builds and pushes to container registry

### 3. **User Authentication & Verification**
- **Email Verification**: Send OTP or confirmation links before booking
- **Phone Verification**: SMS-based verification for phone bookings
- **Identity Validation**: Prevent fraudulent bookings with multi-factor authentication
- **Patient Records**: Integration with existing medical record systems

### 4. **Enhanced Notifications**
- **Email Integration**: Send calendar invites (.ics files) that patients can add to their calendars
- **SMS Notifications**: Appointment confirmations and reminders
- **Calendar Sync**: Two-way sync with popular calendar applications (Outlook, Apple Calendar)
- **Reminder System**: Automated reminders 24 hours and 1 hour before appointments

### 5. **LLM Evaluation & Monitoring**
- **Conversation Quality**: Real-time evaluation of AI responses for accuracy and empathy
- **Node Performance**: Track success rates and failure points in conversation flows
- **Intent Recognition**: Monitor and improve natural language understanding
- **A/B Testing**: Test different conversation flows for optimal patient experience
- **Analytics Dashboard**: Comprehensive metrics on booking success rates and conversation quality

---

**Ready to schedule appointments with AI! 🤖📅**
