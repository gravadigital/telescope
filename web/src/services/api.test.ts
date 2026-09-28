import { apiRequest } from "../config/api";
import { EventService, UserService } from "./api";
import { User } from "../types";

jest.mock("../config/api", () => ({
  ...jest.requireActual("../config/api"),
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("EventService.getAllEvents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("relanza el error de red sin fabricar eventos (TS-8)", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(EventService.getAllEvents()).rejects.toThrow("Failed to fetch");
  });

  it("no devuelve los eventos fabricados conocidos ante un error", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));

    let events;
    try {
      events = await EventService.getAllEvents();
    } catch {
      events = undefined;
    }

    expect(events).toBeUndefined();
  });
});

describe("EventService.getEventById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("relanza el error de red sin devolver el evento fabricado, aunque el id coincida con el fallback demo (TS-9)", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(
      EventService.getEventById("68a94135-77f9-42a8-9b43-fea50d6ca524")
    ).rejects.toThrow("Failed to fetch");
  });

  it("sigue devolviendo null en respuesta vacía real (TS-10)", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: null });

    const result = await EventService.getEventById("id-valido");

    expect(result).toBeNull();
  });
});

describe("UserService.getUserEvents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("relanza el error de red en vez de devolver [] silencioso (TS-11)", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(UserService.getUserEvents("user-1")).rejects.toThrow("Failed to fetch");
  });

  it("sigue devolviendo [] en lista vacía real (TS-12)", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: [] });

    const result = await UserService.getUserEvents("user-1");

    expect(result).toEqual([]);
  });
});

describe("EventService.getEventParticipants", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("relanza el error de red en vez de devolver [] silencioso (TS-1)", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(EventService.getEventParticipants("ev-1")).rejects.toThrow("Failed to fetch");
  });

  it("sigue devolviendo [] en lista vacía real (TS-2)", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 0,
      data: { event: { id: "ev-1", name: "E", stage: "participation" }, participants: [] },
    });

    const result = await EventService.getEventParticipants("ev-1");

    expect(result).toEqual([]);
  });

  it("mapea el camino feliz sin cambios (TS-3)", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      count: 1,
      data: {
        participants: [{ id: "u1", name: "Test User", email: "t@t.com", role: "participant" }],
      },
    });

    const result = await EventService.getEventParticipants("ev-1");

    const expected: User[] = [
      {
        id: "u1",
        name: "Test User",
        email: "t@t.com",
        role: "participant",
        joinedEventIDs: [],
        createdEventIDs: [],
      },
    ];
    expect(result).toEqual(expected);
  });
});
