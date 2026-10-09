import { apiRequest, downloadFile, ApiError } from "../config/api";
import * as fs from "fs";
import * as path from "path";
import {
  EventService,
  UserService,
  DistributedVotingService,
  AttachmentService,
  neutralFilename,
  extensionForMime,
} from "./api";
import { VotingConfiguration } from "../types";
import { VotingConfigPreview } from "../domain/voting";
import { API_CONFIG } from "../config/api";

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

const detail = {
  id: "e-1", name: "Concurso de afiches", description: "Diseña el afiche del festival",
  stage: "participation", author_id: "u-1", organizer: "Club de Diseño", max_participants: 15,
  participant_ids: ["u-2"], participants_count: 1, is_paused: false, is_cancelled: false,
  start_date: "2026-10-06", end_date: "2026-10-07", participation_estimated_end_date: "2026-10-20",
  voting_estimated_end_date: null, created_at: "2026-10-05T12:00:00Z", updated_at: "2026-10-05T13:00:00Z",
  attachment_count: 0,
};

describe("EventService.createEvent / updateEvent (S-014)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("crea el evento con la fecha automática y devuelve el id (TS-14)", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockedApiRequest.mockResolvedValue({ event: { id: "e-9" }, code: "EVENT_CREATED" });
    const result = await EventService.createEvent(
      { name: "Concurso de afiches", description: "Diseña el afiche del festival", organizer: "Club de Diseño", max_participants: 20 },
      new Date(2026, 9, 5)
    );
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    const [url, options] = mockedApiRequest.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/events");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(
      '{"name":"Concurso de afiches","description":"Diseña el afiche del festival","organizer":"Club de Diseño","max_participants":20,"start_date":"2026-10-06","end_date":"2026-10-07"}'
    );
    expect(result).toEqual({ id: "e-9" });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("relanza el error de nombre duplicado (TS-15)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new ApiError({ status: 409, body: { error: "An event with this name already exists", code: "DUPLICATE_EVENT_NAME" } });
    mockedApiRequest.mockRejectedValue(error);
    await expect(
      EventService.createEvent({ name: "x", description: "y", organizer: "", max_participants: 20 })
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_EVENT_NAME" });
  });

  it("edita solo un campo y mapea el evento (TS-16)", async () => {
    mockedApiRequest.mockResolvedValue({ data: detail, code: "EVENT_UPDATED" });
    const event = await EventService.updateEvent("e-1", { max_participants: 15 });
    const [url, options] = mockedApiRequest.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/events/e-1");
    expect(options.method).toBe("PATCH");
    expect(options.body).toBe('{"max_participants":15}');
    expect(event).toMatchObject({
      id: "e-1", title: "Concurso de afiches", organizer: "Club de Diseño", max_participants: 15,
      participant_ids: ["u-2"], stage: "participation", creator_id: "u-1",
    });
  });

  it("relanza el error del PATCH con sus extras (TS-17)", async () => {
    const error = new ApiError({ status: 400, body: { error: "x", code: "MAX_PARTICIPANTS_BELOW_REGISTERED", current_count: 12 } });
    mockedApiRequest.mockRejectedValue(error);
    await expect(EventService.updateEvent("e-1", { max_participants: 3 })).rejects.toMatchObject({
      status: 400, code: "MAX_PARTICIPANTS_BELOW_REGISTERED", details: { current_count: 12 },
    });
  });

  it("no fabrica el organizador (TS-18)", async () => {
    mockedApiRequest.mockResolvedValue({ data: { ...detail, organizer: undefined } });
    const event = await EventService.getEventById("e-1");
    expect(event?.organizer).toBe("");
    const source = fs.readFileSync(path.join(__dirname, "api.ts"), "utf-8");
    expect(source).not.toContain("Organizador por determinar");
  });
});

describe("S-015 · servicios del detalle", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("TS-15 mapea la respuesta de la subida a Attachment", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        id: "a-7",
        filename: "propuesta.pdf",
        size: 2516582,
        mime_type: "application/pdf",
        description: "Versión final",
        participant: "Ana Pérez",
        uploaded_at: "2026-10-05T13:00:00Z",
      },
      code: "UPLOAD_SUCCESS",
    });
    const pdf = new File(["x"], "propuesta.pdf", { type: "application/pdf" });

    const result = await AttachmentService.uploadAttachment("e-1", "u-1", pdf, "Versión final");

    const [url, options] = mockedApiRequest.mock.calls[0];
    expect(url).toBe("/api/v1/events/e-1/participant/u-1/attachment");
    expect(options?.method).toBe("POST");
    const body = options?.body as FormData;
    expect(body.get("file")).toBe(pdf);
    expect(body.get("description")).toBe("Versión final");
    expect(result).toEqual({
      id: "a-7",
      event_id: "e-1",
      participant_id: "u-1",
      original_name: "propuesta.pdf",
      file_size: 2516582,
      mime_type: "application/pdf",
      description: "Versión final",
      uploaded_at: "2026-10-05T13:00:00Z",
      stored_name: "",
    });
  });

  it("TS-16 getParticipants devuelve solo participantes con su fecha de inscripción", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        event: { id: "e-1", name: "Concurso de afiches", stage: "participation" },
        participants: [
          { id: "u-9", name: "Org", email: "o@x.com", role: "creator", created_at: "2026-10-01T10:00:00Z" },
          { id: "u-2", name: "Bruno Ríos", email: "b@x.com", role: "participant", created_at: "2026-10-02T10:00:00Z" },
        ],
      },
      count: 2,
    });

    const result = await EventService.getParticipants("e-1");

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/v1/events/e-1/participants");
    expect(result).toEqual([
      { id: "u-2", name: "Bruno Ríos", email: "b@x.com", role: "participant", created_at: "2026-10-02T10:00:00Z" },
    ]);
  });

  it("TS-17 la inscripción manda nombre y email sin console.log", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockedApiRequest.mockResolvedValueOnce({ data: {}, code: "PARTICIPANT_REGISTERED" });

    await EventService.registerForEvent("e-1", "Ana Pérez", "ana@example.com");

    const [url, options] = mockedApiRequest.mock.calls[0];
    expect(url).toBe("/api/v1/events/e-1/register");
    expect(options?.body).toBe('{"participant_name":"Ana Pérez","participant_email":"ana@example.com"}');
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("TS-18 resultados no calculados rechaza con code RESULTS_NOT_CALCULATED", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new ApiError({ status: 404, body: { error: "RESULTS_NOT_CALCULATED", message: "x" } })
    );
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(DistributedVotingService.getDistributedResults("e-1")).rejects.toMatchObject({
      status: 404,
      code: "RESULTS_NOT_CALCULATED",
    });
  });

  it("TS-19 no quedan metadatos de compartir en el servicio", () => {
    const source = fs.readFileSync(path.join(__dirname, "api.ts"), "utf8");
    expect(source).not.toContain("getShareable" + "EventInfo");
  });
});


describe("S-016 · servicios de gestión (Task 2)", () => {
  const config: VotingConfiguration = {
    id: "c-1",
    event_id: "e-1",
    attachments_per_evaluator: 2,
    quality_good_threshold: 0.6,
    quality_bad_threshold: 0.3,
    adjustment_magnitude: 3,
    min_evaluations_per_file: 2,
  };

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("TS-15 abrir inscripción manda solo stage y fecha", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { id: "e-1", stage: "participation", participation_estimated_end_date: "2026-10-12" },
      code: "STAGE_UPDATED",
      transition: { from: "creation", to: "participation" },
    });

    const result = await EventService.updateEventStage("e-1", "participation", "2026-10-12");

    const [url, options] = mockedApiRequest.mock.calls[0];
    expect(url).toBe("/api/v1/events/e-1/stage");
    expect(options?.method).toBe("PATCH");
    expect(options?.body).toBe('{"stage":"participation","estimated_end_date":"2026-10-12"}');
    expect(result).toEqual({ stage: "participation" });
  });

  it("TS-16 abrir votación en una sola llamada con voting_config", async () => {
    const input = {
      attachments_per_evaluator: 2,
      min_evaluations_per_file: 2,
      adjustment_magnitude: 3,
      quality_good_threshold: 0.6,
      quality_bad_threshold: 0.3,
    };
    mockedApiRequest.mockResolvedValueOnce({
      data: { stage: "voting" },
      voting: { configuration: config, assignments_count: 3, total_attachments: 3 },
    });

    const result = await EventService.updateEventStage("e-1", "voting", "2026-10-12", input);

    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
    const [url, options] = mockedApiRequest.mock.calls[0];
    expect(url).toBe("/api/v1/events/e-1/stage");
    expect(options?.method).toBe("PATCH");
    expect(JSON.parse(options?.body as string)).toEqual({
      stage: "voting",
      estimated_end_date: "2026-10-12",
      voting_config: input,
    });
    expect(result).toEqual({
      stage: "voting",
      voting: { configuration: config, assignments_count: 3, total_attachments: 3 },
    });
  });

  it("TS-17 publicar manda solo stage", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { stage: "results" } });

    await EventService.updateEventStage("e-1", "results");

    expect(mockedApiRequest.mock.calls[0][1]?.body).toBe('{"stage":"results"}');
  });

  it("TS-18 propaga el ApiError con code", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new ApiError({ status: 500, body: { error: "x", code: "VOTING_SETUP_ERROR" } })
    );

    await expect(
      EventService.updateEventStage("e-1", "voting", "2026-10-12", { attachments_per_evaluator: 2 })
    ).rejects.toMatchObject({ status: 500, code: "VOTING_SETUP_ERROR" });
  });

  it("updateEstimatedEndDate no escribe en consola", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { event_id: "e-1", stage: "voting", estimated_end_date: "2026-10-20", previous_date: "" },
      code: "ESTIMATED_DATE_UPDATED",
    });

    await EventService.updateEstimatedEndDate("e-1", "voting", "2026-10-20");

    expect(console.log).not.toHaveBeenCalled();
  });

  it("TS-19 vista previa del reparto", async () => {
    const preview: VotingConfigPreview = {
      participants_count: 4,
      participants_with_proposal: 3,
      can_open_voting: true,
      min_m: 1,
      max_m: 2,
      recommended_m: 2,
      defaults: { quality_good_threshold: 0.6, quality_bad_threshold: 0.3, adjustment_magnitude: 3 },
    };
    mockedApiRequest.mockResolvedValueOnce({ data: preview });

    const result = await DistributedVotingService.getVotingConfigPreview("e-1");

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/v1/events/e-1/voting-config/preview");
    expect(result).toEqual(preview);
  });

  it("TS-20 configuración aplicada: datos, null en CONFIG_NOT_FOUND, relanza el resto", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: config });
    await expect(DistributedVotingService.getVotingConfig("e-1")).resolves.toEqual(config);
    expect(mockedApiRequest).toHaveBeenCalledWith("/api/v1/events/e-1/voting-config");

    mockedApiRequest.mockRejectedValueOnce(
      new ApiError({ status: 404, body: { error: "x", code: "CONFIG_NOT_FOUND" } })
    );
    await expect(DistributedVotingService.getVotingConfig("e-1")).resolves.toBeNull();

    mockedApiRequest.mockRejectedValueOnce(
      new ApiError({ status: 500, body: { error: "x", code: "CONFIG_LOOKUP_ERROR" } })
    );
    await expect(DistributedVotingService.getVotingConfig("e-1")).rejects.toMatchObject({
      status: 500,
      code: "CONFIG_LOOKUP_ERROR",
    });
  });

  it("TS-21 recordatorio", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { type: "file", recipients_count: 1 },
      message: "x",
      code: "REMINDER_SENT",
    });

    const result = await EventService.sendReminder("e-1", "file");

    const [url, options] = mockedApiRequest.mock.calls[0];
    expect(url).toBe("/api/v1/events/e-1/reminders");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBe('{"type":"file"}');
    expect(result).toEqual({ type: "file", recipients_count: 1 });
  });

  it("TS-22 deprecados fuera y endpoints nuevos", () => {
    expect("getEventParticipants" in EventService).toBe(false);
    expect("createVotingConfig" in DistributedVotingService).toBe(false);
    expect("generateAssignments" in DistributedVotingService).toBe(false);
    expect("GENERATE_ASSIGNMENTS" in API_CONFIG.ENDPOINTS).toBe(false);
    expect(API_CONFIG.ENDPOINTS.EVENT_REMINDERS("e-1")).toBe("/api/v1/events/e-1/reminders");
    expect(API_CONFIG.ENDPOINTS.VOTING_CONFIG_PREVIEW("e-1")).toBe("/api/v1/events/e-1/voting-config/preview");
  });
});
