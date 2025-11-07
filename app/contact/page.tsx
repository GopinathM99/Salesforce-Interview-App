"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setResponseMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResponseMessage({
          type: "success",
          text: data.message || "Your message has been sent successfully!",
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        setResponseMessage({
          type: "error",
          text: data.error || "Failed to send message. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setResponseMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1", maxWidth: 800, margin: "0 auto" }}>
        <h2 className="title">Contact Us</h2>
        <p className="muted" style={{ marginBottom: 24 }}>
          Have questions, suggestions, or feedback? We'd love to hear from you! Fill out the form below and we'll get back to you as soon as possible.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="name" style={{ fontWeight: 600 }}>
              Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your name"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 16,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="email" style={{ fontWeight: 600 }}>
              Email <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 16,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="subject" style={{ fontWeight: 600 }}>
              Subject <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 16,
                backgroundColor: "white",
              }}
            >
              <option value="">Select a subject</option>
              <option value="General Feedback">General Feedback</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Question Content">Question Content</option>
              <option value="Subscription Issue">Subscription Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="message" style={{ fontWeight: 600 }}>
              Message <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Tell us what's on your mind..."
              rows={6}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 16,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {responseMessage && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor:
                  responseMessage.type === "success"
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${
                  responseMessage.type === "success"
                    ? "rgba(34, 197, 94, 0.3)"
                    : "rgba(239, 68, 68, 0.3)"
                }`,
                color: responseMessage.type === "success" ? "#166534" : "#7f1d1d",
              }}
            >
              {responseMessage.text}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              className="btn primary"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
            <Link href="/" className="btn" style={{ flex: 1, textAlign: "center" }}>
              Back to Home
            </Link>
          </div>
        </form>

        <div
          className="card"
          style={{
            marginTop: 32,
            backgroundColor: "#f8f9fa",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Other Ways to Connect</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Looking for something specific? Here are some helpful resources:
          </p>
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              <Link href="/subscribe" style={{ color: "#007bff", textDecoration: "none" }}>
                Manage your subscription preferences
              </Link>
            </li>
            <li style={{ marginBottom: 8 }}>
              <Link href="/flashcards" style={{ color: "#007bff", textDecoration: "none" }}>
                Practice with flashcards
              </Link>
            </li>
            <li style={{ marginBottom: 8 }}>
              <Link href="/mcq" style={{ color: "#007bff", textDecoration: "none" }}>
                Take multiple choice quizzes
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
