import React, { useState, useEffect } from "react";
import "./Auth.css";
import { AuthProps, FormData, User } from "../../types";
import AuthForm from "../auth-form/AuthForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import LinkButton from "../link-button/LinkButton";
import GoogleLoginButton from "./GoogleLoginButton";
import UsernameModal from "./UsernameModal";
import { useAuth } from "../../context/AuthContext";
import { GoogleAuthService } from "../../services/api";

type OAuthState =
  | { phase: 'idle' }
  | { phase: 'verifying' }
  | { phase: 'new_user'; googleToken: string; suggestedName: string }
  | { phase: 'error'; message: string };

const Auth: React.FC<AuthProps> = ({ initialMode = "login", onClose }) => {
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === "login");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [oauthState, setOauthState] = useState<OAuthState>({ phase: 'idle' });
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const { login } = useAuth();

  useEffect(() => {
    const checkApi = () => {
      const isHealthy = true;
      setApiAvailable(isHealthy);
    };
    checkApi();
  }, []);

  const handleSwitchMode = (): void => {
    setIsLogin(!isLogin);
    setError("");
    setShowForgotPassword(false);
    setFormData({ name: "", email: "", password: "" });
  };

  const handleGoogleSuccess = async (credential: string) => {
    setOauthState({ phase: 'verifying' });
    try {
      const result = await GoogleAuthService.verify(credential);
      if (result.status === 'existing_user' && result.token && result.user) {
        const user: User = {
          id: result.user.id,
          name: result.user.username,
          email: result.user.email,
          role: 'participant',
          joinedEventIDs: [],
          createdEventIDs: [],
        };
        login(user, result.token);
        onClose?.();
      } else if (result.status === 'new_user') {
        setOauthState({
          phase: 'new_user',
          googleToken: credential,
          suggestedName: result.profile?.suggested_name || '',
        });
      }
    } catch (err: any) {
      setOauthState({
        phase: 'error',
        message: err.message || 'Failed to authenticate with Google',
      });
    }
  };

  const handleGoogleError = (err: unknown) => {
    setOauthState({
      phase: 'error',
      message: 'Could not connect to Google. Please try again.',
    });
  };

  if (oauthState.phase === 'new_user') {
    return (
      <UsernameModal
        googleToken={oauthState.googleToken}
        suggestedName={oauthState.suggestedName}
        onSuccess={() => onClose?.()}
        onClose={() => setOauthState({ phase: 'idle' })}
      />
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>🔭 {isLogin ? "Login" : "Register"}</h2>
      </div>

      {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
        <>
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={oauthState.phase === 'verifying'}
          />

          <div className="auth-divider">
            <span>or continue with</span>
          </div>
        </>
      )}

      {oauthState.phase === 'error' && (
        <div className="error-message">{oauthState.message}</div>
      )}

      {showForgotPassword ? (
        <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
      ) : (
        <>
          <AuthForm
            mode={isLogin ? "login" : "register"}
            setMode={(mode) => setIsLogin(mode === "login")}
            error={error}
            setError={setError}
            formData={formData}
            setFormData={setFormData}
            apiAvailable={apiAvailable}
            onLoginSuccess={onClose}
          />
          {isLogin && (
            <div className="forgot-password-link">
              <LinkButton
                label="Forgot your password?"
                onClick={() => setShowForgotPassword(true)}
              />
            </div>
          )}
          <p>{isLogin ? "Don't have an account? " : "Already have an account? "}</p>
          <LinkButton
            label={isLogin ? "Register here" : "Login"}
            onClick={handleSwitchMode}
          />
        </>
      )}

      <div className="auth-info">
        <p className="demo-notice">
          💡 This is a demo project.
          {!apiAvailable && " API is not available, running in local mode."}
        </p>
      </div>
    </div>
  );
};

export default Auth;
