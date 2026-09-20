# apps/mobile

Expo app, TypeScript, expo-router. BuildPack v1.8 section 2.1.

Not scaffolded yet. Phase S Block 5 installs the Expo SDK and builds the thin
capture slice. Navigation ships as standard JS tabs with an opaque surface;
NativeTabs stays locked out until the gate 4 spike passes the five criteria in
BuildPack section 9.

When the first source file lands, add `{ "path": "./apps/mobile" }` to the
root `tsconfig.json` references. An empty composite project fails `tsc --build`,
so it stays unreferenced until then.
