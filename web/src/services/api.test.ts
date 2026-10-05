import { apiRequest, downloadFile } from "../config/api";
import {
  EventService,
  UserService,
  DistributedVotingService,
  AttachmentService,
  neutralFilename,
  extensionForMime,
} from "./api";
import { User } from "../types";

jest.mock("../config/api", () => ({
  ...jest.requireActual("../config/api"),
  apiRequest: jest.fn(),
  downloadFile: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockedDownloadFile = downloadFile as jest.MockedFunction<typeof downloadFile>;

describe("EventService.listEvents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("arma la query solo con valores (TS-1)", async () => {
    mockedApiRequest.mockResolvedValue({ data: [] });
    await EventService.listEvents({ q: "  afiche ", stage: "participation", page: 2, limit: 10 });
    expect(mockedApiRequest).toHaveBeenLastCalledWith(
      "/api/v1/events?q=afiche&stage=participation&page=2&limit=10"
    );
    await EventService.listEvents({ q: "", page: 1 });
    expect(mockedApiRequest).toHaveBeenLastCalledWith("/api/v1/events?page=1");
  });

  it("mapea la respuesta (TS-2)", async () => {
    mockedApiRequest.mockResolvedValue({
      data: [
        {
          id: "e-1", name: "Concurso de afiches", description: "x", stage: "participation",
          author_id: "u-9", max_participants: 20, participants_count: 12, participant_ids: ["u-2"],
          participation_estimated_end_date: "2026-10-10", voting_estimated_end_date: null,
          is_paused: false, is_cancelled: false, created_at: "2026-09-28T12:00:00Z",
          start_date: "2026-10-01",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, total_pages: 1 },
      filters: { stage: "" },
      stage_counts: { participation: 4, voting: 2, results: 2 },
    });
    const result = await EventService.listEvents({});
    expect(result).toEqual({
      items: [
        {
          id: "e-1", name: "Concurso de afiches", description: "x", stage: "participation",
          author_id: "u-9", max_participants: 20, participants_count: 12, participant_ids: ["u-2"],
          participation_estimated_end_date: "2026-10-10", voting_estimated_end_date: null,
          is_paused: false, is_cancelled: false, created_at: "2026-09-28T12:00:00Z",
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      stageCounts: { participation: 4, voting: 2, results: 2 },
    });
    expect(result.items[0]).not.toHaveProperty("organizer");
  });

  it("relanza el error de red sin fabricar eventos (TS-3)", async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(EventService.listEvents({})).rejects.toThrow("Failed to fetch");
  });

  it("rechaza una respuesta sin lista en vez de devolver vacío", async () => {
    mockedApiRequest.mockResolvedValueOnce({});
    await expect(EventService.listEvents({})).rejects.toThrow("Invalid response");
  });
});

describe("UserService.getMyEvents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("pide scope=all y mapea (TS-4)", async () => {
    mockedApiRequest.mockResolvedValue({
      data: [
        {
          id: "e-3", name: "Feria", title: "Feria", description: "", stage: "creation",
          role: "creator", my_status: null, max_participants: 30, participants_count: 0,
          participation_estimated_end_date: null, voting_estimated_end_date: null,
          is_paused: false, is_cancelled: false, author_id: "u-1", created_at: "2026-10-01T09:00:00Z",
          organizer: "Ana",
        },
      ],
    });
    const result = await UserService.getMyEvents("u-1");
    expect(mockedApiRequest).toHaveBeenCalledWith("/api/v1/users/u-1/events?scope=all");
    expect(result).toEqual([
      {
        id: "e-3", name: "Feria", description: "", stage: "creation", role: "creator",
        my_status: null, max_participants: 30, participants_count: 0,
        participation_estimated_end_date: null, voting_estimated_end_date: null,
        is_paused: false, is_cancelled: false, author_id: "u-1", created_at: "2026-10-01T09:00:00Z",
      },
    ]);
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

describe("DistributedVotingService.getParticipantAssignment", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("desenvuelve el payload anónimo (TS-5)", async () => {
    const assignment = {
      id: "a1",
      event_id: "e1",
      is_completed: false,
      completed_at: null,
      attachments: [
        { id: "f1", label: "Propuesta 1", mime_type: "application/pdf", file_size: 1048576, description: "Mi propuesta de logo" },
      ],
    };
    mockedApiRequest.mockResolvedValueOnce({
      assignment,
      event_name: "Concurso de logos",
      participant_id: "p1",
    });

    const result = await DistributedVotingService.getParticipantAssignment("e1", "p1");

    expect(result).toEqual(assignment);
    expect(mockedApiRequest).toHaveBeenCalledWith("/api/v1/events/e1/participants/p1/assignment");
  });

  it("devuelve null con NO_ASSIGNMENT (TS-6)", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      Object.assign(new Error("Participant has no assignment in this event"), {
        status: 404,
        code: "NO_ASSIGNMENT",
      })
    );

    await expect(DistributedVotingService.getParticipantAssignment("e1", "p1")).resolves.toBeNull();
  });

  it("relanza otros errores (TS-7)", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      Object.assign(new Error("Event not found"), { status: 404 })
    );

    await expect(DistributedVotingService.getParticipantAssignment("e1", "p1")).rejects.toThrow(
      "Event not found"
    );
  });
});

describe("neutralFilename", () => {
  it("usa la extensión del MIME conocido (TS-8)", () => {
    expect(neutralFilename(2, "application/pdf")).toBe("propuesta-2.pdf");
    expect(
      neutralFilename(1, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toBe("propuesta-1.docx");
    expect(neutralFilename(3, "image/jpeg")).toBe("propuesta-3.jpg");
    expect(extensionForMime("text/plain")).toBe("txt");
  });

  it("usa bin fuera del mapa (TS-9)", () => {
    expect(neutralFilename(3, "application/zip")).toBe("propuesta-3.bin");
  });
});

describe("AttachmentService.downloadAssignedAttachment", () => {
  it("descarga con nombre neutro (TS-10)", async () => {
    mockedDownloadFile.mockResolvedValueOnce(undefined);

    await AttachmentService.downloadAssignedAttachment("f2", 2, "image/png");

    expect(mockedDownloadFile).toHaveBeenCalledWith("/api/v1/attachments/f2/download", "propuesta-2.png");
  });
});
