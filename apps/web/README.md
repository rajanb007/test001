# apps/web

Next.js App Router on Vercel. Public pages, share render, admin console.
BuildPack v1.8 section 2.1.

Not scaffolded yet. Phase S needs no web surface beyond the static mocks in
Block 6; the canonical `/aircraft/[airframe_id]` route and the admin console
are Phase 0 work, BuildPack section 9.

When the first source file lands, add `{ "path": "./apps/web" }` to the root
`tsconfig.json` references. An empty composite project fails `tsc --build`, so
it stays unreferenced until then.
