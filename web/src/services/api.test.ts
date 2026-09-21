import { apiRequest } from "../config/api";
import { EventService, UserService } from "./api";

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
