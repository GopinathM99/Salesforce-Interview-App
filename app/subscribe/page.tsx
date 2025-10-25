"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_TYPES = ["Knowledge", "Scenario"];
// Practice mode is always Flashcards - no selection needed
const DELIVERY_FREQUENCIES = ["Daily", "Weekly", "Bi-weekly"];
const QUESTION_COUNTS = ["1", "2", "3", "4", "5"];

interface SubscriptionPreferences {
  email: string;
  topics: string[];
  difficulties: string[];
  questionTypes: string[];
  practiceModes: string[];
  questionCount: string;
  deliveryFrequency: string;
  includeAnswers: boolean;
  customMessage?: string;
}

export default function SubscribePage() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [subscriptionFeedback, setSubscriptionFeedback] = useState<string | null>(null);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<SubscriptionPreferences>({
    email: user?.email || "",
    topics: [],
    difficulties: [],
    questionTypes: [],
    practiceModes: ["Flashcards"], // Always flashcards
    questionCount: "3",
    deliveryFrequency: "Daily",
    includeAnswers: true,
    customMessage: ""
  });

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  useEffect(() => {
    const loadTopics = async () => {
      setTopicsLoading(true);
      const { data, error } = await supabase.rpc("list_topics");
      if (error) {
        console.error("Failed to load topics", error);
        setAvailableTopics([]);
      } else {
        const unique = Array.from(
          new Set(((data as string[]) ?? []).filter((topic): topic is string => Boolean(topic)))
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setAvailableTopics(unique);
      }
      setTopicsLoading(false);
    };

    void loadTopics();
  }, []);

  const handleTopicToggle = (topic: string) => {
    setPreferences(prev => ({
      ...prev,
      topics: toggleArrayItem(prev.topics, topic)
    }));
  };

  const handleDifficultyToggle = (difficulty: string) => {
    setPreferences(prev => ({
      ...prev,
      difficulties: toggleArrayItem(prev.difficulties, difficulty)
    }));
  };

  const handleQuestionTypeToggle = (type: string) => {
    setPreferences(prev => ({
      ...prev,
      questionTypes: toggleArrayItem(prev.questionTypes, type)
    }));
  };

  // Practice mode toggle removed - always flashcards

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const trimmedEmail = preferences.email.trim();
    if (!trimmedEmail) {
      setSubscriptionStatus("error");
      setSubscriptionFeedback("Please enter an email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setSubscriptionStatus("error");
      setSubscriptionFeedback("Please enter a valid email address.");
      return;
    }

    if (preferences.topics.length === 0) {
      setSubscriptionStatus("error");
      setSubscriptionFeedback("Please select at least one topic.");
      return;
    }

    if (preferences.questionTypes.length === 0) {
      setSubscriptionStatus("error");
      setSubscriptionFeedback("Please select at least one question type.");
      return;
    }

    setSubscriptionStatus("loading");
    setSubscriptionFeedback(null);

    try {
      // Find an existing subscription record for this user/email so we update instead of inserting
      let existingId: string | null = null;

      if (user?.id) {
        const { data: existingByUser, error: lookupError } = await supabase
          .from("subscription_preferences")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (lookupError && lookupError.code !== "PGRST116") {
          throw lookupError;
        }

        existingId = existingByUser?.id ?? null;
      }

      if (!existingId) {
        const { data: existingByEmail, error: emailLookupError } = await supabase
          .from("subscription_preferences")
          .select("id")
          .eq("email", trimmedEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emailLookupError && emailLookupError.code !== "PGRST116") {
          throw emailLookupError;
        }

        existingId = existingByEmail?.id ?? null;
      }

      const payload = {
        ...(existingId ? { id: existingId } : {}),
        email: trimmedEmail,
        user_id: user?.id || null,
        topics: preferences.topics,
        difficulties: preferences.difficulties,
        question_types: preferences.questionTypes,
        practice_modes: preferences.practiceModes,
        question_count: parseInt(preferences.questionCount, 10),
        delivery_frequency: preferences.deliveryFrequency,
        include_answers: preferences.includeAnswers,
        custom_message: preferences.customMessage || null,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // Store subscription preferences in database (update if id exists, insert otherwise)
      const { error } = await supabase.from("subscription_preferences").upsert(payload, { onConflict: "id" });

      if (error) {
        throw error;
      }

      setSubscriptionStatus("success");
      setSubscriptionFeedback(
        `Successfully subscribed! You'll receive ${preferences.deliveryFrequency.toLowerCase()} challenges with ${preferences.questionCount} question${preferences.questionCount !== '1' ? 's' : ''} covering ${preferences.topics.length} topic${preferences.topics.length > 1 ? 's' : ''} in flashcard format.`
      );
    } catch (error) {
      console.error("Subscription error:", error);
      setSubscriptionStatus("error");
      setSubscriptionFeedback("Failed to subscribe. Please try again.");
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
        
        <h1 className="title">Subscribe to Daily Challenges</h1>
        <p className="muted">
          Get personalized Salesforce interview questions delivered to your inbox. 
          Choose your topics, difficulty levels, and question types to create the perfect study plan.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Email Section */}
          <div className="card">
            <h3>Email Address</h3>
            <input
              type="email"
              placeholder="you@email.com"
              value={preferences.email}
              onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.value }))}
              required
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
          </div>

          {/* Topics Section */}
          <div className="card">
            <h3>Topics *</h3>
            <p className="muted">Select the Salesforce topics you want to focus on:</p>
            {topicsLoading ? (
              <p className="muted">Loading topics…</p>
            ) : availableTopics.length === 0 ? (
              <p className="muted">
                No topics available yet. Add questions in Supabase to populate this list.
              </p>
            ) : (
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}
              >
                {availableTopics.map((topic) => (
                  <label key={topic} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={preferences.topics.includes(topic)}
                      onChange={() => handleTopicToggle(topic)}
                    />
                    <span>{topic}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Section */}
          <div className="card">
            <h3>Difficulty Levels</h3>
            <p className="muted">Choose the difficulty levels you want to practice:</p>
            <div style={{ display: "flex", gap: 16 }}>
              {DIFFICULTY_LEVELS.map(difficulty => (
                <label key={difficulty} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={preferences.difficulties.includes(difficulty)}
                    onChange={() => handleDifficultyToggle(difficulty)}
                  />
                  <span>{difficulty}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Question Types Section */}
          <div className="card">
            <h3>Question Types *</h3>
            <p className="muted">Select the types of questions you want to receive:</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {QUESTION_TYPES.map(type => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={preferences.questionTypes.includes(type)}
                    onChange={() => handleQuestionTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Practice Mode is always Flashcards - no selection needed */}

          {/* Number of Questions Section */}
          <div className="card">
            <h3>Number of Questions</h3>
            <p className="muted">How many questions would you like to receive per challenge?</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {QUESTION_COUNTS.map(count => (
                <label key={count} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="questionCount"
                    value={count}
                    checked={preferences.questionCount === count}
                    onChange={(e) => setPreferences(prev => ({ ...prev, questionCount: e.target.value }))}
                  />
                  <span>{count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Frequency Section */}
          <div className="card">
            <h3>Delivery Frequency</h3>
            <p className="muted">How often would you like to receive challenges?</p>
            <div style={{ display: "flex", gap: 16 }}>
              {DELIVERY_FREQUENCIES.map(frequency => (
                <label key={frequency} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="deliveryFrequency"
                    value={frequency}
                    checked={preferences.deliveryFrequency === frequency}
                    onChange={(e) => setPreferences(prev => ({ ...prev, deliveryFrequency: e.target.value }))}
                  />
                  <span>{frequency}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="card">
            <h3>Additional Options</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={preferences.includeAnswers}
                onChange={(e) => setPreferences(prev => ({ ...prev, includeAnswers: e.target.checked }))}
              />
              <span>Include answers with questions</span>
            </label>
          </div>

          {/* Custom Message */}
          <div className="card">
            <h3>Custom Message (Optional)</h3>
            <p className="muted">Add any specific instructions or requests for your challenges:</p>
            <textarea
              placeholder="e.g., Focus on real-world scenarios, include code examples..."
              value={preferences.customMessage}
              onChange={(e) => setPreferences(prev => ({ ...prev, customMessage: e.target.value }))}
              style={{ 
                width: "100%", 
                padding: 8, 
                borderRadius: 4, 
                border: "1px solid #ccc",
                minHeight: 80,
                resize: "vertical"
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn primary"
            disabled={subscriptionStatus === "loading"}
            style={{ alignSelf: "flex-start" }}
          >
            {subscriptionStatus === "loading" ? "Subscribing..." : "Subscribe to Challenges"}
          </button>

          {/* Feedback Message */}
          {subscriptionFeedback && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: subscriptionStatus === "success" 
                  ? "rgba(34, 197, 94, 0.1)" 
                  : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${subscriptionStatus === "success" 
                  ? "rgba(34, 197, 94, 0.3)" 
                  : "rgba(239, 68, 68, 0.3)"}`,
                color: subscriptionStatus === "success" ? "#166534" : "#922B21",
                fontWeight: 600
              }}
            >
              {subscriptionFeedback}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
