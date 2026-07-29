# PocketBase Security Boundary

Status: accepted bootstrap architecture.

Create one PocketBase client per SvelteKit request. Raw auth records, privileged calls, secrets, and hidden content stay server-side. Browser route data receives explicit sanitized projections. Persisted commands must be server-authoritative and use atomic expected-version checks. Bootstrap does not change remote schema or assume source table-product collections fit dungeon runs.
