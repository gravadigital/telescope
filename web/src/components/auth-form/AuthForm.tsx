import React, { ChangeEvent, FormEvent, useState } from "react";
import { TAuthForm, User } from "../../types";
import { UserService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function renderButtonLabel(loading: boolean, isLogin: boolean) {
  if (loading) {
    return "Processing...";
  } else if (isLogin) {
    return "🚀 Login";
  } else {
    return "✨ Register";
  }
}

export default function AuthForm({
  mode,
  setMode,
  formData,
  setFormData,
  error,
  setError,
  apiAvailable,
  onLoginSuccess,
}: TAuthForm) {
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!formData.email) {
      setError("Email is required");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    if (mode === "register") {
      if (!formData.name) {
        setError("Name is required for registration");
        return;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    if (!apiAvailable) {
      setError("API is not available. Please try again later.");
      return;
    }

    setLoading(true);

    try {
      let userData: User;
      let token: string;

      if (mode === "login") {
        // Authenticate with real API
        const authResponse = await UserService.authenticateUser(
          formData.email,
          formData.password
        );
        userData = authResponse.user;
        token = authResponse.token;
        console.log("✅ User authenticated with API:", userData.email);
        console.log(
          "🔑 Token received:",
          token ? `${token.substring(0, 30)}...` : "NO TOKEN"
        );
        login(userData, token);

        // Close modal on successful login
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        // Create new user
        const createResponse = await UserService.createUser({
          name: formData.name || "User",
          email: formData.email,
          password: formData.password,
        });
        console.log(
          "✅ User created successfully:",
          createResponse.user.email
        );

        // Auto-login after registration
        login(createResponse.user, createResponse.token);

        // Close modal on successful registration
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (apiError: any) {
      console.error("API error:", apiError);

      // Extract error message from API response
      let errorMessage = "Authentication failed. Please try again.";

      if (apiError.message) {
        errorMessage = apiError.message;
      } else if (apiError.error) {
        errorMessage = apiError.error;
      }

      // Handle specific error codes
      if (errorMessage.includes("already exists") || errorMessage.includes("EMAIL_ALREADY_EXISTS")) {
        errorMessage = "This email is already registered. Please login instead.";
        setMode("login");
      } else if (errorMessage.includes("Invalid email or password") || errorMessage.includes("INVALID_CREDENTIALS")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (errorMessage.includes("password must be at least")) {
        errorMessage = "Password must be at least 8 characters.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {mode === "register" && (
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            required={mode === "register"}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password || ""}
          onChange={handleChange}
          placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
          required
          minLength={8}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {renderButtonLabel(loading, mode === "login")}
      </button>
    </form>
  );
}
