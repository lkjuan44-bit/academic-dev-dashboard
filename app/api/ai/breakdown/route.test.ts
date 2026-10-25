import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { handleBreakdown } from "@/lib/ai/breakdown";

const authenticatedSession = async () => ({ user: { id: "test-user" } });

const originalApiKey = process.env.AI_API_KEY;
const originalModel = process.env.AI_MODEL;
const originalBaseUrl = process.env.AI_BASE_URL;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.AI_API_KEY;
  } else {
    process.env.AI_API_KEY = originalApiKey;
  }

  if (originalModel === undefined) {
    delete process.env.AI_MODEL;
  } else {
    process.env.AI_MODEL = originalModel;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.AI_BASE_URL;
  } else {
    process.env.AI_BASE_URL = originalBaseUrl;
  }

  mock.restoreAll();
});

test("returns a client error for malformed JSON and an empty title", async () => {
  const invalidJson = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      body: "{",
    }),
    authenticatedSession,
  );
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");

  const emptyTitle = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "  " }),
    }),
    authenticatedSession,
  );
  assert.equal(emptyTitle.status, 400);
  assert.equal((await emptyTitle.json()).error.code, "INVALID_TITLE");
});

test("returns an explicit service error if the provider is not configured", async () => {
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;

  const response = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Preparar el informe" }),
    }),
    authenticatedSession,
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "AI_NOT_CONFIGURED");
});

test("returns exactly four subtasks from the configured compatible provider", async () => {
  process.env.AI_API_KEY = "test-api-key";
  process.env.AI_MODEL = "test-model";
  process.env.AI_BASE_URL = "https://provider.example/v1/";

  const subtasks = [
    "Definir la pregunta principal del informe",
    "Reunir fuentes académicas pertinentes",
    "Redactar un esquema con los argumentos",
    "Revisar las citas y corregir el borrador",
  ];
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ subtasks }) } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );

  const response = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Preparar el informe" }),
    }),
    authenticatedSession,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { subtasks });
  assert.equal(
    fetchMock.mock.calls[0]?.arguments[0],
    "https://provider.example/v1/chat/completions",
  );
});

test("rejects requests without an authenticated user", async () => {
  const response = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Preparar el informe" }),
    }),
    async () => null,
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHORIZED");
});

test("rejects a provider response without four valid subtasks", async () => {
  process.env.AI_API_KEY = "test-api-key";
  process.env.AI_MODEL = "test-model";
  mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ subtasks: ["Una"] }) } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );

  const response = await handleBreakdown(
    new Request("http://localhost/api/ai/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Preparar el informe" }),
    }),
    authenticatedSession,
  );

  assert.equal(response.status, 502);
  assert.equal(
    (await response.json()).error.code,
    "AI_PROVIDER_INVALID_SUBTASKS",
  );
});
