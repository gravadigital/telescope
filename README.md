# Telescope

[![CI](https://github.com/gravadigital/telescope/actions/workflows/ci.yml/badge.svg)](https://github.com/gravadigital/telescope/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Distributed peer review for calls where proposals outnumber the people available to judge
them. Instead of a committee, the participants rank each other's proposals — and evaluating
carefully is what moves your own proposal up.

```
browser ── HTTP ──> web ── HTTP + JWT ──> api ──> PostgreSQL
                  (React SPA)             (Go)  ├─> MinIO (proposal files)
                                                └─> SMTP  (notifications)
```

The interesting part is the **voting engine**, an implementation of Merrifield & Saari (2009),
*Telescope time without tears*. Each participant ranks `m` proposals that are not their own; a
Modified Borda Count combines the ranks into a global ranking; and each evaluator is scored on
how close they came to the consensus. **Good evaluators see their own proposal rise, careless
ones see it fall** — which is what makes it worth evaluating well.

The rule the result depends on — **nobody evaluates their own proposal** — is enforced twice:
in the Go code and by PostgreSQL triggers, so no write that bypasses the api can break it.

## What it does

Events that move through `creation → participation → voting → results`; public registration
through a shareable link; one proposal per participant; the configurable assignment and
ranking; the published results; and email notifications at every stage change. Login by email
and password, or with Google.

Full description in [documentation/features.md](documentation/features.md).

## Structure

| Directory                        | What it is                                               |
| -------------------------------- | -------------------------------------------------------- |
| [api/](api/)                     | HTTP service in Go: events, identity, files, voting      |
| [web/](web/)                     | The user interface: a React single-page app              |
| [deploy/](deploy/)               | The Docker Compose stack for running it locally          |
| [documentation/](documentation/) | Using and running Telescope — the public documentation   |
| [docs/](docs/)                   | Internal docs: architecture, decisions, flows, product   |

## Getting started

Requires **Docker**. Nothing to configure first:

```sh
make up       # builds and starts everything
```

The web is at http://localhost:3000 and the api at http://localhost:8080. `make stop` stops it
keeping the data.

To work on the code, run the database and storage in Docker and each part by hand:

```sh
make infra    # database + MinIO
make api      # needs Go 1.26
make web      # needs Node.js 22
make test
```

Run `make` to list every command. Details in
[documentation/installation.md](documentation/installation.md).

## Documentation

Two sets of documentation, for two audiences:

**[documentation/](documentation/README.md)** — using and running Telescope. English, brief,
stable. Start with its README: it maps how the parts fit together.

| | |
|---|---|
| [features.md](documentation/features.md) | what the product does, and how the voting works |
| [installation.md](documentation/installation.md) · [configuration.md](documentation/configuration.md) | how to run and configure it |
| [api-reference.md](documentation/api-reference.md) | the HTTP endpoints |
| [docs/apis/api.yaml](docs/apis/api.yaml) | the HTTP contract (OpenAPI 3.0) |

**[docs/](docs/)** — the internal working documentation: architecture per service,
conventions, decision records and flows. Written in Spanish, for the team that builds
Telescope. It follows the grava-workflow methodology in [`.claude/`](.claude/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Grava.
