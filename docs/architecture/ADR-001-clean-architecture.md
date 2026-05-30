# ADR-001: Clean Architecture Pattern

**Date:** 2026-05-30
**Status:** Accepted
**Scope:** `apps/api/src/`

## Context

The AdNexus API grew from a flat Express.js application with route files directly querying Supabase into a dual-layer system. Legacy routes in `src/routes/` mix HTTP handling, business logic, and database access. This created tight coupling, difficult testing, and inconsistent error handling.

## Decision

Adopt Clean Architecture with four layers and a strict dependency rule:

```
domain/          <- Entities, value objects, repository interfaces, events
application/     <- Use cases, ports (interfaces), DI container
infrastructure/  <- Repository implementations, platform clients, DB connections
interface/       <- HTTP controllers, routes, middleware
```

**Dependency rule:** dependencies point inward only. `interface` depends on `application`, which depends on `domain`. `infrastructure` implements `domain` interfaces. No layer imports outward.

## Layer Responsibilities

### Domain (`src/domain/`)

Pure business entities with no framework dependencies.

- **Entities** (`entities/`): TypeScript interfaces defining business objects (Campaign, Draft, User, Workspace, Ad, AdAccount, etc.)
- **Value Objects** (`value-objects/`): `Result<T, E>` discriminated union for error handling, `Money` for currency
- **Repository Interfaces** (`repositories/`): Abstract contracts like `ICampaignRepository` that define data access without implementation details
- **Events** (`events/`): `DomainEvent` base class and `InMemoryEventBus` for domain event publishing

### Application (`src/application/`)

Orchestration layer that encodes business rules.

- **Use Cases** (`use-cases/`): One class per operation. Each use case:
  1. Performs authorization checks (role validation)
  2. Validates input
  3. Calls repository interfaces
  4. Publishes domain events
  5. Logs audit entries
  6. Returns `Result<T>` (never throws on expected failures)

- **Ports** (`ports/`): Interfaces for external services (`IPlatformClient`, `IAuditLogger`, `INotificationService`)
- **Container** (`services/Container.ts`): Manual DI container with explicit constructor injection

### Infrastructure (`src/infrastructure/`)

Implementation details that fulfill domain contracts.

- **Repositories** (`repositories/`): Raw pg Pool SQL implementations of `IXxxRepository` interfaces
- **Database** (`database/connection.ts`): Thin `pg.Pool` wrapper with `query()` and `transaction()` helpers
- **Platform** (`platform/`): Ad platform clients implementing `IPlatformClient`
- **Audit** (`audit/`): `SupabaseAuditLogger` implementing `IAuditLogger`
- **Notification** (`notification/`): `NotificationService` implementing `INotificationService`

### Interface (`src/interface/`)

HTTP delivery mechanism.

- **Controllers** (`http/controllers/`): Factory functions that create request handlers, calling use cases and mapping `Result<T>` to HTTP responses
- **Routes** (`http/routes/`): Factory functions that create Express routers, applying auth middleware and mapping endpoints to controller methods
- **Middleware** (`http/middleware/`): `requireAuth`, `requireRole`, `errorHandler`

## Composition Root

`src/interface/http/createServer.ts` is the single composition root where all wiring occurs:

1. Instantiate infrastructure adapters (13 repositories)
2. Create `Container` with all adapters injected
3. Create route factories passing the `Container`
4. Mount v2 routes on Express app

The `Container` class (`application/services/Container.ts`, 272 lines) takes a `ContainerConfig` with 13 repositories + event bus + audit logger + notification service, and produces 63 use case instances. All dependencies are injected via constructor -- no decorators or reflection.

## Error Handling Pattern

All use cases return `Result<T, E>` where:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };
```

Domain errors extend `DomainError` with HTTP status codes:
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)

Controllers check `result.success` and either return data or throw the error (caught by `expressErrorHandler`).

## Consequences

**Positive:**
- Use cases are independently testable with mock repositories
- New entities follow a predictable pattern: entity -> repo interface -> use case -> repo impl -> controller -> route
- Database technology can be swapped without touching business logic
- Clear separation of concerns makes code review easier

**Negative:**
- More files per feature (entity + repo interface + use case + repo impl + controller + route)
- Manual DI container grows linearly with use cases
- Legacy routes remain until migration completes

## Migration Path

Legacy routes in `src/routes/` (24 files, 13,662 lines) are gradually replaced by v2 Clean Architecture routes in `src/interface/http/routes/`. Both layers coexist during migration, with v1 routes under `/api/v1/` and v2 under `/api/v2/`.
