import { apiRequest, getErrorCode, ApiRequestError } from "./api";

const originalFetch = global.fetch;

const mockFetchResponse = (status: number, json: () => unknown): void => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => json(),
  }) as unknown as typeof fetch;
};

describe("apiRequest - errores", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("conserva status y code (TS-1)", async () => {
    mockFetchResponse(404, () => ({
      error: "Participant has no assignment in this event",
      code: "NO_ASSIGNMENT",
    }));

    const err = (await apiRequest("/api/v1/events/e1/participants/p1/assignment").catch(
      (e) => e
    )) as ApiRequestError;

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Participant has no assignment in this event");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NO_ASSIGNMENT");
  });

  it("deja code undefined si el body no lo trae (TS-2)", async () => {
    mockFetchResponse(400, () => ({
      error: "Assignments are only available during voting and results stages",
      current_stage: "participation",
    }));

    const err = (await apiRequest("/x").catch((e) => e)) as ApiRequestError;

    expect(err.message).toBe("Assignments are only available during voting and results stages");
    expect(err.status).toBe(400);
    expect(err.code).toBeUndefined();
  });

  it("maneja un body no JSON (TS-3)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError()),
    }) as unknown as typeof fetch;

    const err = (await apiRequest("/x").catch((e) => e)) as ApiRequestError;

    expect(err.message).toBe("HTTP error! status: 502");
    expect(err.status).toBe(502);
    expect(err.code).toBeUndefined();
  });

  it("el 401 sigue limpiando la sesión (TS-4)", async () => {
    localStorage.setItem("telescopio_token", "t");
    localStorage.setItem("telescopio_user", "{}");
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockFetchResponse(401, () => ({ error: "UNAUTHORIZED", message: "Invalid token" }));

    const err = (await apiRequest("/x").catch((e) => e)) as ApiRequestError;

    expect(err.message).toBe("UNAUTHORIZED");
    expect(err.status).toBe(401);
    expect(localStorage.getItem("telescopio_token")).toBeNull();
    const event = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find((e) => e.type === "auth:logout") as CustomEvent | undefined;
    expect(event).toBeDefined();
    expect(event!.detail.reason).toBe("token_expired");
  });
});

describe("getErrorCode", () => {
  it("devuelve el code de un Error", () => {
    expect(getErrorCode(Object.assign(new Error("x"), { code: "NO_ASSIGNMENT" }))).toBe(
      "NO_ASSIGNMENT"
    );
  });

  it("devuelve undefined sin code o con un valor que no es Error", () => {
    expect(getErrorCode(new Error("x"))).toBeUndefined();
    expect(getErrorCode("texto")).toBeUndefined();
  });
});
