import { apiRequest, uploadFile, downloadFile, getErrorCode, ApiError, ApiRequestError } from "./api";

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

describe("ApiError", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("forma A con extras: conserva status, code y details (TS-87)", async () => {
    mockFetchResponse(409, () => ({
      error: "Event stage does not allow updates",
      code: "INVALID_UPDATE_STAGE",
      current_stage: "voting",
    }));

    const err = (await apiRequest("/api/v1/events/e1").catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(409);
    expect(err.code).toBe("INVALID_UPDATE_STAGE");
    expect(err.message).toBe("Event stage does not allow updates");
    expect(err.details).toEqual({ current_stage: "voting" });
  });

  it("forma B: code = error y limpia la sesión (TS-88)", async () => {
    localStorage.setItem("telescopio_token", "t");
    localStorage.setItem("telescopio_user", "{}");
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    mockFetchResponse(401, () => ({ error: "UNAUTHORIZED", message: "Missing Authorization header" }));

    const err = (await apiRequest("/x").catch((e) => e)) as ApiError;

    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("UNAUTHORIZED");
    expect(err.details).toEqual({});
    expect(localStorage.getItem("telescopio_token")).toBeNull();
    expect(localStorage.getItem("telescopio_user")).toBeNull();
    const event = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find((e) => e.type === "auth:logout") as CustomEvent | undefined;
    expect(event!.detail.reason).toBe("token_expired");
  });

  it("forma C sin code y details string (TS-89)", async () => {
    mockFetchResponse(404, () => ({ error: "Event not found" }));
    const c = (await apiRequest("/x").catch((e) => e)) as ApiError;
    expect(c.code).toBeUndefined();
    expect(c.details).toEqual({});

    mockFetchResponse(400, () => ({
      error: "Invalid request payload",
      code: "INVALID_PAYLOAD",
      details: "name is required",
    }));
    const a = (await apiRequest("/x").catch((e) => e)) as ApiError;
    expect(a.code).toBe("INVALID_PAYLOAD");
    expect(a.details).toEqual({ details: "name is required" });
  });

  it("uploadFile y downloadFile lanzan ApiError (TS-90)", async () => {
    mockFetchResponse(400, () => ({
      error: "File too large",
      code: "FILE_TOO_LARGE",
      max_size: "10MB",
      received_size: 11000000,
    }));
    const up = (await uploadFile("/api/v1/events/e1/participant/p1/attachment", new FormData()).catch(
      (e) => e
    )) as ApiError;
    expect(up).toBeInstanceOf(ApiError);
    expect(up.status).toBe(400);
    expect(up.code).toBe("FILE_TOO_LARGE");
    expect(up.details).toEqual({ max_size: "10MB", received_size: 11000000 });

    mockFetchResponse(404, () => ({ error: "Attachment not found", code: "ATTACHMENT_NOT_FOUND" }));
    const down = (await downloadFile("/api/v1/attachments/a1/download", "p.pdf").catch(
      (e) => e
    )) as ApiError;
    expect(down).toBeInstanceOf(ApiError);
    expect(down.status).toBe(404);
    expect(down.code).toBe("ATTACHMENT_NOT_FOUND");
  });

  it("getErrorCode prefiere ApiError y mantiene el duck-typing (TS-91)", () => {
    expect(getErrorCode(new ApiError({ status: 409, body: { error: "x", code: "X" } }))).toBe("X");
    expect(getErrorCode(Object.assign(new Error("x"), { code: "NO_ASSIGNMENT" }))).toBe("NO_ASSIGNMENT");
    expect(getErrorCode("texto")).toBeUndefined();
  });

  it("apiRequest no escribe logs de diagnóstico (TS-92)", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    await apiRequest("/x");
    mockFetchResponse(500, () => ({}));
    await apiRequest("/x").catch(() => undefined);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
