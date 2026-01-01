# Contact Us Section - Implementation Guide

## Quick Reference

### Directory Structure to Create
```
/app/contact/
├── page.tsx           # Contact form page
└── layout.tsx         # Optional: specific layout

/app/api/contact/
└── route.ts          # POST endpoint for form submission
```

---

## Implementation Files

### 1. API Route: /app/api/contact/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Send email to admin
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.CONTACT_EMAIL_RECIPIENT || process.env.GMAIL_USER,
      replyTo: email.trim(),
      subject: `New Contact Form Submission: ${subject.trim()}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name.trim()}</p>
        <p><strong>Email:</strong> ${email.trim()}</p>
        <p><strong>Subject:</strong> ${subject.trim()}</p>
        <p><strong>Message:</strong></p>
        <p>${message.trim().replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Reply to: ${email.trim()}</small></p>
      `,
    });

    // Optional: Send confirmation email to user
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email.trim(),
      subject: 'We received your message',
      html: `
        <p>Hi ${name.trim()},</p>
        <p>Thank you for contacting us. We've received your message and will get back to you as soon as possible.</p>
        <p>Best regards,<br>Salesforce Interview Prep Team</p>
      `,
    });

    return NextResponse.json(
      { success: true, message: 'Your message has been sent successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
```

---

### 2. Contact Page: /app/contact/page.tsx

```typescript
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setFeedback(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setFeedback(data.message);
      setFormData({ name: "", email: "", subject: "", message: "" });
      
      // Clear success message after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/" className="btn back-btn" style={{ marginBottom: 16, display: "inline-block" }}>
            ← Back to Home
          </Link>
        </div>

        <h1 className="title">Contact Us</h1>
        <p className="muted">
          Have a question, suggestion, or feedback? We'd love to hear from you.
          Fill out the form below and we'll get back to you as soon as possible.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          {/* Name Field */}
          <div className="card">
            <label htmlFor="name" style={{ display: "block", marginBottom: 8 }}>Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Email Field */}
          <div className="card">
            <label htmlFor="email" style={{ display: "block", marginBottom: 8 }}>Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Subject Field */}
          <div className="card">
            <label htmlFor="subject" style={{ display: "block", marginBottom: 8 }}>Subject *</label>
            <input
              id="subject"
              type="text"
              name="subject"
              placeholder="What is this regarding?"
              value={formData.subject}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Message Field */}
          <div className="card">
            <label htmlFor="message" style={{ display: "block", marginBottom: 8 }}>Message *</label>
            <textarea
              id="message"
              name="message"
              placeholder="Please share your message, question, or feedback..."
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn primary"
            disabled={status === "loading"}
            style={{ alignSelf: "flex-start" }}
          >
            {status === "loading" ? "Sending..." : "Send Message"}
          </button>

          {/* Feedback Message */}
          {feedback && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: status === "success"
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${status === "success"
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(239, 68, 68, 0.3)"}`,
                color: status === "success" ? "#166534" : "#922B21",
                fontWeight: 600
              }}
            >
              {feedback}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
```

---

## Environment Variables to Add

Add to `.env.local`:
```
CONTACT_EMAIL_RECIPIENT=your-email@example.com
```

This is optional - if not set, emails go to `GMAIL_USER`.

---

## Integration Points

### Option 1: Add to Footer (in layout.tsx)
```tsx
<footer className="footer">
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <span>Built with Next.js + Supabase</span>
    <span> | </span>
    <Link href="/contact" className="btn" style={{ padding: "4px 12px", fontSize: "12px" }}>
      Contact Us
    </Link>
  </div>
</footer>
```

### Option 2: Add to Home Page Navigation
In `/app/page.tsx`, add a card before the footer section:
```tsx
<div className="card">
  <h3>Get in Touch</h3>
  <p>Have feedback or want to contribute? Contact us!</p>
  <Link
    className="btn primary home-btn"
    href="/contact"
    style={{ marginTop: 12, display: "inline-block" }}
  >
    Contact Us
  </Link>
</div>
```

---

## Testing Checklist

- [ ] Form validation works (empty fields)
- [ ] Email validation works (invalid format)
- [ ] Form submission sends email
- [ ] Success message appears after submission
- [ ] Confirmation email received by user
- [ ] Admin receives notification email
- [ ] Error handling works
- [ ] Responsive design on mobile
- [ ] Page navigation works ("Back to Home")

---

## Additional Features (Optional)

### Rate Limiting
Add to `/app/api/contact/route.ts`:
```typescript
// In-memory rate limiting (reset on server restart)
const submissionMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const submissions = submissionMap.get(ip) || [];
  const recentSubmissions = submissions.filter(time => now - time < 60000); // Last 60 seconds
  
  if (recentSubmissions.length >= 3) return true; // Max 3 per minute
  
  submissionMap.set(ip, [...recentSubmissions, now]);
  return false;
}
```

### Spam Protection
Consider adding:
- Honeypot field (hidden field that bots fill)
- reCAPTCHA integration
- Content filtering

### Data Storage (Optional)
Store contact submissions in Supabase:
```typescript
// In emailService.ts
export async function logContactSubmission(data: any) {
  const supabase = getSupabaseClient();
  return supabase.from('contact_submissions').insert(data);
}
```

Required table structure:
```sql
CREATE TABLE contact_submissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'new'
);
```

---

## Styling Notes

The Contact Us page uses existing CSS classes from `globals.css`:
- `.card` - Card styling with gradient
- `.btn.primary` - Primary button
- `.btn.back-btn` - Back button
- `.title` - Page title
- `.muted` - Muted text color

All styling automatically inherits the dark theme and color scheme.

