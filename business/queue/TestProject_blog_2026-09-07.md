# Article Outline: Building *TestProject* – A Minimal Next.js Stack

**Target Audience:** Mid-level Frontend & Full-Stack Developers  
**Tone:** Concise, practical, engineering-focused (no fluff, no "tutorial-bro" hype)  
**Tech Stack:** Next.js (App Router), Tailwind CSS, TypeScript  

---

### I. Introduction & Hook
* **Working Title Options:**
  * Minimal by Design: Architecting *TestProject* with Next.js, TypeScript, and Tailwind
  * Stripping Away the Noise: A Production-Ready Next.js Baseline
* **The Hook:**  
  Most modern boilerplates ship with hundreds of megabytes of opinionated junk—ORMs, auth wrappers, and state managers you haven't decided you need yet. *TestProject* intentionally reverses this trend: a hyper-minimal, strictly typed Next.js app hosting a single `/hello` route. The goal isn't just to build a endpoint; it's to establish a clean, predictable architectural baseline that scales without technical debt.
* **Overview of the Final State:**  
  A lightweight footprint delivering a `/hello` UI page and JSON response, running fully typed with zero dynamic runtime bloat.

---

### II. Key Technical Decisions & Rationale

#### Decision 1: Next.js App Router for Explicit Layout Isolation
* **Choice:** Standardizing on the App Router (`/app/hello/page.tsx` and `/app/api/hello/route.ts`) over the legacy Pages Router.
* **Rationale:** Server Components are the default in the App Router. For a route like `/hello`, this means sending zero client-side JavaScript to the browser by default. Layouts and routes remain explicitly isolated, simplifying future middleware and edge runtime migrations.

#### Decision 2: Strict-Mode TypeScript Without Custom Types Wrappers
* **Choice:** Enabling `strict: true`, `noImplicitAny`, and using native Next.js type exports (`NextRequest`, `NextResponse`, `Metadata`) directly from `next/server`.
* **Rationale:** Avoids over-abstracting types early on. Mid-level codebases often degrade due to custom generic wrappers around simple API routes. Relying on Next.js’s built-in inference keeps code readable and drastically reduces build-time type-checking overhead.

#### Decision 3: Utility-First Tailwind CSS with CSS Variables for Theme Tokens
* **Choice:** Vanilla Tailwind setup using CSS native variables in standard root files rather than complex JavaScript theme configs.
* **Rationale:** Keeps the styling engine near zero-runtime. Instead of configuring complex theme objects in `tailwind.config.ts`, defining base utility classes directly allows instantaneous dark-mode/light-mode toggling for the `/hello` route using CSS variables, keeping the bundle slim.

---

### III. The "Gotcha": Static Caching Behavior in Route Handlers
* **The Pitfall:**  
  In the Next.js App Router, unconfigured `GET` handlers in Route Handlers (e.g., `app/api/hello/route.ts`) are cached statically at build time by default if they don't read from incoming request headers or cookies.
* **Impact:**  
  If your `/hello` endpoint returns a dynamic payload (e.g., dynamic timestamps or status checks), it will serve stale, pre-rendered data in production environments despite working dynamically in local development.
* **The Fix:**  
  Explicitly define the route segment config when dynamic behavior is required:
  ```typescript
  export const dynamic = 'force-dynamic';
  ```
  *Alternative:* Pass `NextRequest` into the handler function signature, which automatically opts the route into dynamic request-time rendering.

---

### IV. Implementation Breakdown (Brief Guidance)
* **Directory Structure:**
  ```text
  ├── app/
  │   ├── globals.css
  │   ├── layout.tsx
  │   └── hello/
  │       ├── page.tsx       # Server Component UI
  │       └── route.ts      # JSON API endpoint
  ```
* **Key Snippet Focus:** Demonstrating clean separation between the `/hello` visual view (`page.tsx`) and
