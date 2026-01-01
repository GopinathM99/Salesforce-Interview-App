# Salesforce Interview App - Project Structure Analysis

## 1. Framework & Technology Stack

**Primary Framework:** Next.js 14 (Full-stack React framework)
**UI Library:** React 18
**Styling:** Tailwind CSS 4.1 + custom CSS with CSS variables
**Backend/Database:** Supabase (PostgreSQL with JWT auth)
**Email Service:** Nodemailer + Gmail SMTP
**AI Integration:** Google Generative AI (Gemini)
**Component Library:** shadcn/ui (some components like Button, Select)
**UI Icons:** Lucide React + React Icons

**Package Highlights:**
- next@14.2.5
- react@18.3.1
- @supabase/supabase-js@2.45.4
- nodemailer@7.0.9
- @google/generative-ai@0.24.1
- react-markdown@10.1.0 (for markdown rendering)

---

## 2. File Structure & Organization

### Root Level Structure
```
/app                    # Next.js App Router (main application)
/components            # React components (reusable UI)
/lib                   # Utility functions, services, types
/styles                # Global CSS and Tailwind configuration
/supabase              # Database schema and migrations
/public                # Static assets
```

### App Directory (/app) - Route Structure
```
/app
├── page.tsx                          # Home page (/)
├── layout.tsx                        # Root layout (header, footer, providers)
├── api/                              # API routes
│   ├── send-individual-email/route.ts
│   ├── send-emails/route.ts
│   ├── debug-email/route.ts
│   ├── unsubscribe/route.ts
│   ├── gemini/route.ts               # AI question generation
│   ├── admin/execute-sql/route.ts
│   └── cron/send-emails/route.ts     # Scheduled email delivery
│
├── flashcards/                       # Flashcard mode
│   ├── page.tsx                      # Main flashcards page
│   └── select/page.tsx               # Category selection
│
├── mcq/                              # Multiple Choice Questions mode
│   ├── page.tsx                      # Main MCQ page
│   └── select/page.tsx               # Category selection
│
├── coding/                           # Coding challenges
│   └── page.tsx
│
├── add-questions/                    # Live Gemini chat for generating questions
│   └── page.tsx
│
├── subscribe/                        # Email subscription management
│   └── page.tsx
│
├── unsubscribe/                      # Email unsubscribe page
│   └── page.tsx
│
└── admin/                            # Admin panel (protected)
    ├── page.tsx                      # Admin dashboard
    ├── new-question/page.tsx         # Create questions
    ├── edit-questions/page.tsx       # Edit existing questions
    ├── email-management/page.tsx     # Email campaign management
    ├── metrics/page.tsx              # Analytics
    ├── users/page.tsx                # User management
    ├── admin-users/page.tsx          # Admin user management
    └── import-export/                # Import/export data
```

### Components (/components)
```
/components
├── ui/                               # shadcn/ui components
│   ├── button.tsx
│   └── select.tsx
├── kibo-ui/code-block/              # Custom code block component
│   ├── index.tsx
│   └── server.tsx
├── AuthProvider.tsx                  # Supabase auth context
├── AuthStatus.tsx                    # User login/logout UI
├── WelcomeMessage.tsx                # Welcome message component
├── CodingSection.tsx                 # Coding challenges section
├── QuestionForm.tsx                  # Form for creating/editing questions
└── AdminAccessShell.tsx              # Admin access control wrapper
```

### Library (/lib)
```
/lib
├── supabaseClient.ts                 # Supabase client initialization
├── emailService.ts                   # Email generation & sending logic
├── useAdminAccess.ts                 # Admin permission hook
├── types.ts                          # TypeScript type definitions
├── csv.ts                            # CSV import/export utilities
└── utils.ts                          # General utilities
```

### Styles (/styles)
```
/styles
└── globals.css                       # Global Tailwind CSS (dark theme, components)
```

---

## 3. Main Navigation & Routing

### Home Page (page.tsx) Routes:
- `/flashcards/select` - Start flashcards study mode
- `/mcq/select` - Start multiple choice questions mode
- `/add-questions` - Live Gemini chat (requires login)
- `/subscribe` - Email subscription settings
- `/admin` - Admin dashboard (requires admin role)
- `/coding` - Coding challenges

### Root Layout Structure:
```tsx
<html>
  <body>
    <AuthProvider>
      <div className="container">
        <header>
          <h1>Salesforce Developer Interview Prep</h1>
          <AuthStatus />  <!-- Login/Logout UI -->
        </header>
        <main>{children}</main>
        <footer>Built with Next.js + Supabase</footer>
      </div>
    </AuthProvider>
  </body>
</html>
```

---

## 4. API Routes & Backend Functionality

### Email Service Routes:
1. **POST /api/send-individual-email**
   - Sends single email to subscriber with personalized questions
   - Takes subscriptionId in request body

2. **POST /api/send-emails**
   - Bulk email sender for active subscriptions
   - Generates questions based on subscription preferences

3. **GET /api/cron/send-emails**
   - Scheduled cron job for periodic email delivery
   - Integrated with Vercel cron or external scheduler

4. **POST /api/debug-email**
   - Testing endpoint for email delivery

5. **POST /api/unsubscribe**
   - Handles unsubscribe requests from email tokens

### AI Generation:
6. **POST /api/gemini**
   - Generates new interview questions using Google Gemini API
   - Accepts question type, topic, difficulty parameters

### Admin:
7. **POST /api/admin/execute-sql**
   - Direct database queries (admin only)

---

## 5. Main Layout Structure

### Visual Hierarchy:
```
Header (Fixed)
├── Title: "Salesforce Developer Interview Prep"
└── AuthStatus (Login button / User menu)

Main Content (Responsive Grid)
├── Card 1: Welcome Message (if logged in)
├── Card 2: "Choose a Mode" 
│   ├── Flash Cards
│   ├── Multiple Choice
│   └── Try New Questions (Gemini - requires login)
├── Card 3: Coding Section
├── Card 4: Subscribe to Daily Challenges
├── Card 5: Admin Panel (if admin)
└── Card 6: Reset Progress

Footer
└── "Built with Next.js + Supabase"
```

### CSS Classes & Styling:
- **Dark Theme:** CSS variables with dark color scheme
- **Card Design:** Glassmorphism (backdrop blur + gradient borders)
- **Grid System:** `display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))`
- **Button Variants:** `.btn`, `.btn.primary`, `.btn.success`, `.btn.danger`, `.btn.reveal-btn`, `.btn.next-btn`, `.btn.back-btn`
- **Color Scheme:**
  - Primary: #3b82f6 (Blue)
  - Success: #10b981 (Green)
  - Danger: #ef4444 (Red)
  - Accent 3: #8b5cf6 (Purple)
  - Accent 4: #f59e0b (Orange)
  - Background: #0a0e1a (Dark Navy)
  - Card: #1a1f2e

---

## 6. Form Handling & Validation

### Existing Form Examples:

#### Subscribe Form (/subscribe/page.tsx)
- **Type:** Client component ("use client")
- **State Management:** useState for form data
- **Validation:** Email regex + required field checks
- **Database:** Supabase `.upsert()` for create/update
- **Features:**
  - Topic selection (multi-checkbox)
  - Difficulty level selection
  - Question type selection
  - Question count (radio buttons)
  - Delivery frequency (radio buttons)
  - Custom message textarea
  - Form status feedback (success/error messages)

#### Question Form (QuestionForm.tsx)
- **Type:** Reusable component
- **State Management:** useState for form fields
- **Validation:** Required field checks, MCQ-specific validation
- **Database Operations:** 
  - Insert/update main question
  - Upsert MCQ options
  - Refresh data after save
- **Error Handling:** Try-catch with user-friendly messages

### Common Patterns:
1. **"use client"** directive for client-side forms
2. **FormEvent handling** with event.preventDefault()
3. **Email validation** using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
4. **Textarea/Input styling** with gradients and Tailwind
5. **Success/Error messages** shown below submit button
6. **Disabled states** during loading
7. **Loading indicators** ("Saving...", "Loading...")

---

## 7. Email Functionality

### Email Service (lib/emailService.ts):
- **Provider:** Nodemailer with Gmail SMTP
- **Configuration:** Uses environment variables
  - GMAIL_USER
  - GMAIL_APP_PASSWORD
  - SUPABASE credentials

### Email Features:
1. **Template Generation:** HTML email templates for questions
2. **Question Selection:** Query-based question generation with filters
3. **Subscription Management:** 
   - Store subscription preferences in Supabase
   - Track email delivery logs
   - Handle unsubscribe tokens
4. **Scheduling:** Cron-based delivery (Daily, Weekly, Bi-weekly)
5. **Personalization:** Questions based on user preferences

### Email Database Tables (Supabase):
- `subscription_preferences` - User email preferences
- `email_delivery_logs` - Email send history
- `unsubscribe_tokens` - Unsubscribe tokens for safe unsubscribe

---

## 8. Authentication & Authorization

### Supabase Auth:
- **Method:** Google OAuth
- **Context:** `AuthProvider` component in /components
- **Hook:** `useAuth()` for accessing user state

### Protected Routes:
- Admin routes check `isAdmin` status via RPC
- Gemini features require login
- Subscription management requires login

### RPC Function:
- `is_admin()` - Checks if user has admin privileges

---

## 9. Environment Configuration

### .env.local Setup:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GEMINI_API_KEY=[key]
GMAIL_USER=[email]
GMAIL_APP_PASSWORD=[app-password]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

---

## RECOMMENDATIONS FOR ADDING A CONTACT US SECTION

### Suggested Approach:

**Option A: Standalone Page (Recommended)**
- **Location:** `/app/contact/page.tsx`
- **Features:**
  - Contact form with fields: Name, Email, Subject, Message
  - Client-side form (use client)
  - Validation with error messages
  - Email submission via API route
  - Success confirmation message

**Option B: API-Only Route**
- **Location:** `/app/api/contact/route.ts`
- **Method:** POST endpoint to handle contact form submissions
- **Logic:**
  - Validate form data
  - Send email via nodemailer
  - Store submission in Supabase if desired
  - Return success/error response

**Option C: Modal/Dialog Component**
- Add a "Contact Us" button to the footer or header
- Open modal with inline contact form
- Most non-invasive approach

### Implementation Steps:

1. **Create API Route:** `/app/api/contact/route.ts`
   - Handle POST requests
   - Validate inputs
   - Send email using nodemailer
   - Return JSON response

2. **Create Page Component:** `/app/contact/page.tsx`
   - Client component with form
   - Similar form pattern to subscribe page
   - Use same Tailwind styling
   - Submit to /api/contact

3. **Optional: Add to Navigation**
   - Footer link: `<Link href="/contact">Contact Us</Link>`
   - Or add to header menu

4. **Use Existing Patterns:**
   - Form validation from subscribe page
   - Email sending from emailService.ts
   - Error/success message styling
   - Card and button classes from globals.css

### Email Configuration Needed:
- Contact email recipient (admin email)
- Email template for notification
- Optionally store submissions in Supabase table

---

## Key Insights

1. **Architecture:** Fully server-side with Next.js App Router
2. **State Management:** Component-level (no Redux/Zustand)
3. **Database:** Supabase PostgreSQL with real-time capabilities
4. **Styling:** Utility-first with Tailwind + CSS variables for theming
5. **Code Quality:** TypeScript throughout, proper error handling
6. **Accessibility:** Basic ARIA labels where present
7. **Responsive Design:** Mobile-first with auto-fit grid
8. **Email**: Well-integrated with nodemailer and Supabase tracking

