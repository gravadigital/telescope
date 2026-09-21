import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthForm from "./AuthForm";
import { UserService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { FormData } from "../../types";

jest.mock("../../services/api");
jest.mock("../../context/AuthContext");

const mockedUserService = UserService as jest.Mocked<typeof UserService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderAuthForm(overrides: {
  formData?: FormData;
  mode?: "login" | "register";
  apiAvailable?: boolean;
  login?: jest.Mock;
  onLoginSuccess?: jest.Mock;
} = {}) {
  const login = overrides.login || jest.fn();
  const setError = jest.fn();
  const setMode = jest.fn();
  const setFormData = jest.fn();
  const onLoginSuccess = overrides.onLoginSuccess || jest.fn();

  mockedUseAuth.mockReturnValue({
    user: null,
    token: null,
    login,
    logout: jest.fn(),
    updateUser: jest.fn(),
    joinEvent: jest.fn(),
    isAuthenticated: false,
    loading: false,
    openAuthModal: jest.fn(),
  });

  const formData: FormData = overrides.formData || {
    name: "",
    email: "a@a.com",
    password: "abc12345",
  };

  render(
    <AuthForm
      mode={overrides.mode || "login"}
      setMode={setMode}
      formData={formData}
      setFormData={setFormData}
      error=""
      setError={setError}
      apiAvailable={overrides.apiAvailable ?? true}
      onLoginSuccess={onLoginSuccess}
    />
  );

  return { login, setError, setMode, onLoginSuccess };
}

describe("AuthForm handleSubmit", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("TS-1: email vacío no llama a la API y muestra el error real", async () => {
    const { setError, login } = renderAuthForm({
      formData: { name: "", email: "", password: "abc12345" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith("Email is required");
    });
    expect(mockedUserService.authenticateUser).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
  });

  it("TS-2: password vacío no llama a la API", async () => {
    const { setError } = renderAuthForm({
      formData: { name: "", email: "a@a.com", password: "" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith("Password is required");
    });
    expect(mockedUserService.authenticateUser).not.toHaveBeenCalled();
  });

  it("TS-3: fallo real de API no loguea con token demo", async () => {
    mockedUserService.authenticateUser.mockRejectedValueOnce(
      new Error("Invalid email or password. Please try again.")
    );
    const { setError, login } = renderAuthForm();

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith(
        "Invalid email or password. Please try again."
      );
    });
    expect(login).not.toHaveBeenCalled();
    const demoTokenCalls = login.mock.calls.filter(([, token]) =>
      /^demo-token-/.test(token)
    );
    expect(demoTokenCalls).toHaveLength(0);
  });

  it("TS-4: registro con fallo real de API no loguea con token demo", async () => {
    mockedUserService.createUser.mockRejectedValueOnce(new Error("Server error"));
    const { setError, login } = renderAuthForm({
      mode: "register",
      formData: { name: "Test", email: "a@a.com", password: "abc12345" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(setError).toHaveBeenCalled();
    });
    expect(login).not.toHaveBeenCalled();
    const demoTokenCalls = login.mock.calls.filter(([, token]) =>
      /^demo-token-/.test(token)
    );
    expect(demoTokenCalls).toHaveLength(0);
  });

  it("TS-7: API caída (apiAvailable=false) no deriva en login demo", async () => {
    const { setError, login } = renderAuthForm({ apiAvailable: false });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(setError).toHaveBeenCalled();
    });
    expect(login).not.toHaveBeenCalled();
    expect(mockedUserService.authenticateUser).not.toHaveBeenCalled();
    const demoTokenCalls = login.mock.calls.filter(([, token]) =>
      /^demo-token-/.test(token)
    );
    expect(demoTokenCalls).toHaveLength(0);
  });

  it("TS-13: login exitoso sigue funcionando (regresión del camino feliz)", async () => {
    const user = {
      id: "u1",
      name: "A",
      email: "a@a.com",
      role: "participant" as const,
      joinedEventIDs: [],
      createdEventIDs: [],
    };
    mockedUserService.authenticateUser.mockResolvedValueOnce({
      user,
      token: "real-jwt",
    });
    const { login, onLoginSuccess } = renderAuthForm();

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(user, "real-jwt");
    });
    expect(onLoginSuccess).toHaveBeenCalled();
  });
});
