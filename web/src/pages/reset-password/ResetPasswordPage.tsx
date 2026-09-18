import React, { useState, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserService } from "../../services/api";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setLoading(true);
    try {
      await UserService.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-card">
          <h2 className="reset-password-title">🔭 Reset Password</h2>
          <div className="error-message">Invalid or missing reset token.</div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-card">
          <h2 className="reset-password-title">🔭 Password Updated</h2>
          <p className="reset-password-success">
            Your password has been updated successfully.
          </p>
          <button
            className="auth-submit-btn"
            onClick={() => navigate("/")}
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <h2 className="reset-password-title">🔭 Reset Password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              type="password"
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Updating..." : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
