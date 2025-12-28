# Salesforce Interview App - Project Tracker

## Project Overview

A Salesforce interview preparation application with quiz features, AI-powered assistance (Gemini), user authentication, admin panel, and subscription-based daily challenges.

---

## Completed Features

### User Features
- [x] Show user name when logged in
- [x] User can reset and clear all attempts
- [x] User dropdown on top left
- [x] Only logged-in users can use Gemini Live
- [x] Allow users to change subscription choices

### Quiz & Questions
- [x] For coding questions, limit to one question at a time
- [x] Coding part displayed in code block
- [x] Create new column "sub-topic" in questions

### Admin Features
- [x] Add Administrators
- [x] Admin Only Sections
- [x] Admin home page with Metrics section (table with topics/difficulty)
- [x] Metrics: Show questions by topics, types, difficulty
- [x] Count of users and user data table in admin panel
- [x] Mirror daily cap in `/api/gemini` for API protection

### Integrations
- [x] Connect to GitHub
- [x] Connect Gopi.live
- [x] Live Gemini answers (1-2 short paragraphs)

### Bug Fixes
- [x] Fixed: Mango Gopinath and Pamuru automatically becoming active

---

## Pending Features

### Authentication & User Management
- [ ] Username and password sign up
  - [ ] Send verification emails
- [x] One-time code login (6 digits sent to email)
- [x] Add browser favicon/icon
- [ ] If logout from Admin panel, redirect to Home page

### Quiz & Question Features
- [ ] MCQ: Allow users to re-attempt questions they got wrong
- [x] Allow users to save questions
- [ ] Allow users to add comments on questions
- [ ] Fix duplicate topics appearing (e.g., sharing rules)
- [x] MCQ: Show warning when submitting without selecting a choice
- [x] Add Question Type column (Knowledge vs Scenarios)

### AI Features
- [x] Ask follow-up questions
- [x] Change regular chat to 'gemini flash' model
- [x] Show API call metrics separately for each AI model
- [x] Check if ping to all models working (admin page)

### Live Agent Prep
- [x] Chat and Live Agent Prep
- [x] Add AI Chat. AI Chat will recieve the Transcript from the interview.
- [x] Questions are being repeated. Try questions from the database only. for both Audio and Chat.
- [ ]

### Admin Features
- [x] Daily/monthly user visits tracking
- [x] Show API calls per day in chart on admin page

### UI/UX Improvements
- [ ] Improve UI - make it beautiful
- [ ] Buttons and cards should not move
- [ ] Different colors for triggers, Apex files, LWC, etc.
- [ ] Different themes support
- [ ] UI improvements using Gemini 3.0 multimodal capabilities

### Subscriptions & Daily Challenges
- [ ] Subscribe to daily challenges
  - [x] Remember user preferences
  - [x] Send email with daily challenges
  - [ ] Remind users about general questions if category is empty
  - [ ] Reveal answers with Question #
  - [x] "Send now" button with subscription selection
  - [ ] Email questions should not count as attempts
  - [ ] Allow users to unsubscribe
  - [ ] Mobile app different setup
  - [ ] If no related questions, send from other topics

### Content & Integrations
- [x] Add more clouds (Litify, CPQ, etc.)
- [ ] Coding section improvements

---

## Google Cloud Info

- **Project ID:** salesforce-interview-472821
- **Project Number:** 131530624339

---

*Last Updated: December 14, 2025*
