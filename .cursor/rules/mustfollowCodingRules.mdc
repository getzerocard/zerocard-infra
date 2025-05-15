---
description: 
globs: 
alwaysApply: true
---
# ⚙️ NestJS Backend Code Rules (Cusdor Standard)

Follow these principles when writing or generating code for all you do  These rules enforce structure, performance, and clarity — and help you avoid duplicating logic or writing unnecessary code.

---

## ✅ 1. Function Rules

**Use this:**

- Keep every function **single-purpose and small**.
- Name functions clearly: e.g., `sendOtpEmail`, `generatePaymentLink`.
- Extract **reusable functions** into `/common/utils/` or module-level `utils.ts`.
- Use early returns for validation failures.
- Wrap async code in short, meaningful `try/catch` blocks only where necessary.
- Always handle concurrency properly with `Promise.allSettled` or parallel handling.
- Always check for **existing functions** before writing a new one — reuse or improve instead of duplicating.

**Avoid this:**

- Don’t bloat functions with multiple responsibilities.
- Don’t write duplicate logic — check `/common/utils/` and shared modules first.
- Don’t leave hardcoded error messages or magic values.
- Don’t write long `try/catch` blocks just to "be safe" — only catch when you can handle errors gracefully.
- Don’t use **fallback logic** to silently skip over failures — prefer explicit errors.

---

## 🧱 2. Class Rules (Services, Providers, Helpers)

**Use this:**

- Use classes for services and shared logic (`UserService`, `PaymentProcessor`).
- Inject dependencies with `@Inject()` or via constructor.
- Mark private methods clearly (`private formatPayload()`).
- Break down large classes into smaller helpers if they grow too big.
- Keep one responsibility per class.

**Avoid this:**

- Don’t dump unrelated logic into the same service.
- Don’t instantiate services manually — use Nest’s DI.
- Don’t access `.env` directly in services — use the `ConfigService`.

---

## 🧹 3. Validation Rules

**Use this:**

- Always validate inputs with **Pipes** (`ValidationPipe` + `class-validator`).
- For custom validation logic, create a **custom pipe** (e.g., `ParseObjectIdPipe`).
- Decouple validation into a dedicated file: `validators.ts` inside each module.
- Keep DTOs clean, and validate at the controller level.

**Avoid this:**

- Don’t put raw `if (!value)` validation logic inside controllers or services.
- Don’t reuse DTOs between modules unless truly shared.

---

## 🔁 4. Pipes, Interceptors, and Filters

**Use this:**

- If a transformation or check needs to happen consistently, write a **custom pipe**.
  - Example: `TrimStringPipe`, `ParseUUIDPipe`, `UserExistsPipe`.
- If you need to wrap or modify responses globally or per route, use an **interceptor**.
  - Example: `LoggingInterceptor`, `ResponseTransformInterceptor`.
- If you want to catch and modify exceptions globally or per scope, use an **exception filter**.
  - Example: `AllExceptionsFilter`, `HttpExceptionFilter`.
- **Before writing any pipe/interceptor/filter, check if one already exists** in `/common/` or used globally.

**Avoid this:**

- Don’t repeat the same logic across multiple controllers — wrap it in a pipe or interceptor.
- Don’t use `try/catch` everywhere to format errors — use a filter instead.
- Don’t write a new pipe/interceptor/filter when one already exists — reuse or improve.

---

## 🚦 5. Concurrency and High-Load Handling

**Use this:**

- Write all async logic to be **non-blocking**.
- Use `Promise.allSettled()` or native async handling for concurrency.
- Use rate-limiting and batching for external API and DB interactions.
- Add timeouts and retries for third-party services — only when needed and explicit.
- Handle critical paths (like payments) carefully with idempotency or locking mechanisms.

**Avoid this:**

- ❗ **DO NOT use queues (e.g., BullMQ, RabbitMQ, etc.) or Redis unless specifically approved** — we are not using them by default.
- Don’t block with await in loops — batch process where possible.
- Don’t assume external services will always succeed — handle failures clearly.
- Don’t use generic fallbacks like `value || default` without understanding the failure case.
- Don’t silently continue if something fails — be explicit about what to do on failure.

---

## 🧭 6. Code Structure and File Rules

**Use this:**

- Use proper NestJS structure: `controller.ts`, `service.ts`, `module.ts`, `dto/`, `validators/`, `pipes/`, `interceptors/`, `filters/`.
- Keep shared logic in `/common/` or `/shared/`.
- Place all request validation in DTOs or custom pipes.
- Keep controller lean — handle logic in services only.

**Avoid this:**

- Don’t write logic directly in controllers.
- Don’t mix unrelated logic in the same file.
- Don’t keep logic in route handlers — use services and inject dependencies.

---

## 🧠 7. Best Practices & Dev Standards

**Use this:**

- Always check if a utility, pipe, or handler already exists before writing a new one.
- Use NestJS logging (`Logger`) instead of `console.log`.
- Create reusable exception types (e.g., `InsufficientBalanceException`) for clarity.
- Always write unit tests for pipes, utils, and critical services.
- Document tricky flows with clear comments.
- Use `nestjs/config` properly — don't hardcode secrets.

**Avoid this:**

- Don’t skip error handling or assume Nest will handle everything.
- Don’t expose raw exceptions — sanitize them with filters.
- Don’t re-invent logic — search first before writing.
- Don’t overuse `try/catch` — catch only when you can actually handle or rethrow cleanly.