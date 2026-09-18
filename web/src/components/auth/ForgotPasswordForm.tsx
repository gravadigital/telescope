import React, { useState, FormEvent } from "react";
import { UserService } from "../../services/api";

type Props = {
  onBack: () => void;
};

export default function ForgotPasswordForm({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await UserService.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="forgot-password-sent">
        <p className="forgot-password-sent-text">
          If that email is registered, you'll receive a reset link shortly.
        </p>
        <button type="button" className="link-button-component-button" onClick={onBack}>
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <p className="forgot-password-description">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <div className="form-group">
        <label htmlFor="forgot-email">Email</label>
        <input
          type="email"
          id="forgot-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </button>
      <div className="forgot-password-back">
        <button type="button" className="link-button-component-button" onClick={onBack}>
          ← Back to login
        </button>
      </div>
    </form>
  );
}
