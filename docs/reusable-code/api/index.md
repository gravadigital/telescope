# Código Reutilizable - api

## Overview

This document lists all reusable code available in this service. Each category has its own
file with detailed documentation.

**IMPORTANT:** This index must be COMPLETE - list ALL elements without truncation. The purpose
is that by reading this index, you can see all available items.

> This catalog started incrementally with S-003. Run `/service-update-reusable-code` for the
> `api` service to do a full scan and complete the remaining categories (utils, services,
> types, validators, constants).

## Components

N/A (Backend service)

## Utils/Helpers

No utils/helpers documented yet.

## Middlewares

**Total: 1**

- **RequireSelfOrEventCreator** (`internal/middleware/auth/permissions.go`) - Allows a request only when the authenticated user is the target `:user_id` or the author of an event in which the target user participates, with no `admin` bypass

See full details in [middlewares.md](./middlewares.md)

## Services/Repositories

**Total: 1**

- **EventRepository.IsCreatorOfEventWithParticipant** (`internal/storage/postgres/event_repository.go`) - Reports whether a user authored any event in which another user has an `event_participants` row, in any stage

See full details in [services.md](./services.md)

## Styles

N/A (Backend service)

## Hooks

N/A (Backend service)

## Types/Interfaces

No types/interfaces documented yet.

## Validators

No validators documented yet.

## Constants

No constants documented yet.
