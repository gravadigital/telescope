# Telescope documentation

Distributed peer review for calls where proposals outnumber the people available to judge
them: the participants rank each other's proposals, and evaluating carefully is what moves your
own proposal up.

This is the documentation for **using and running Telescope**. The internal working
documentation — architecture per service, conventions, decision records, flows — lives in
[`docs/`](../docs/) and is written in Spanish for the team that builds it.

| | |
|---|---|
| [features.md](features.md) | what the product does, and how the voting works |
| [installation.md](installation.md) | how to run it, all in Docker or each part by hand |
| [configuration.md](configuration.md) | what to configure |
| [api-reference.md](api-reference.md) | the HTTP endpoints |

## How the parts fit together

```
   browser
      │
      │  HTTP + JWT
      ▼
     web  ─────── HTTP ───────▶  api  ──────▶  PostgreSQL
   (React SPA,                  (Go)    ├───▶  MinIO (proposal files)
    static files)                       └───▶  SMTP (notifications)
```

Two deployables:

| Part | What it is responsible for |
|---|---|
| `web` | The only user interface. A single-page app served as static files, with no business logic of its own: it shows what the api answers. |
| `api` | Everything else: events and their stages, identity, proposal files, and the voting engine that produces the ranking. The only service with state. |

There is no bus and no service-to-service communication. The voting calculation reads every
vote of an event in one pass, and keeping it in one process is what keeps the result exact
and reproducible.

## The voting engine

The core of the product is an implementation of **Merrifield & Saari (2009)**, *Telescope time
without tears: a distributed approach to peer review*, with a Modified Borda Count. In short:

1. Each participant receives `m` proposals to evaluate — never their own.
2. They rank them, 1 being the best. The ranks are combined into a global ranking.
3. Each evaluator gets a quality score: how close their ranking was to the consensus.
4. Good evaluators see their own proposal move up; poor ones, down.

The fourth step is what makes the model work: evaluating carelessly costs you. The details are
in [features.md](features.md#how-the-voting-works).

## Some rules live in the database

Part of the invariants — most importantly, **nobody can evaluate their own proposal** — are
enforced by PostgreSQL triggers, not only by the Go code. Any write that bypasses the api (a
script, a seed, a test) is still checked.

Two consequences worth knowing:

- A trigger violation reaches the client as a generic `500`, not as a structured error.
- The conflict-of-interest rule exists twice, in Go and in the database. Changing one without
  the other leaves the system inconsistent.

## Going further

- The HTTP contract in full: [`docs/apis/api.yaml`](../docs/apis/api.yaml) (OpenAPI 3.0).
- The database, triggers included: [`docs/db-schemas/telescopio_db.md`](../docs/db-schemas/telescopio_db.md).
- Why things are the way they are: [`docs/adrs/`](../docs/adrs/).
- Contributing: [`CONTRIBUTING.md`](../CONTRIBUTING.md).
