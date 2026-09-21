import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Auth from "./Auth";
import { ApiHealthService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../services/api");
jest.mock("../../context/AuthContext");

const mockedApiHealthService = ApiHealthService as jest.Mocked<typeof ApiHealthService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const API_UNAVAILABLE_TEXT = /API is not available, running in local mode/i;

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    joinEvent: jest.fn(),
    isAuthenticated: false,
    loading: false,
    openAuthModal: jest.fn(),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Auth health check", () => {
  it("TS-5: API disponible no muestra el aviso de modo local", async () => {
    mockedApiHealthService.checkHealth.mockResolvedValueOnce(true);

    render(<Auth />);

    await waitFor(() => {
      expect(mockedApiHealthService.checkHealth).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText(API_UNAVAILABLE_TEXT)).not.toBeInTheDocument();
    });
  });

  it("TS-6: API caída muestra el aviso de modo local", async () => {
    mockedApiHealthService.checkHealth.mockResolvedValueOnce(false);

    render(<Auth />);

    await waitFor(() => {
      expect(screen.getByText(API_UNAVAILABLE_TEXT)).toBeInTheDocument();
    });
  });
});
