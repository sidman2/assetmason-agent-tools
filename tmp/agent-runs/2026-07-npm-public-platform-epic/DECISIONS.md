Treat the registry readback failure as eventual consistency, not a publish failure. Fix the workflow with bounded retry on exact-version verification.

Use env-driven private parity inputs behind a checked-in manifest so the public package can skip private parity explicitly when the private source is unavailable.

Record public verification as component evidence plus `verify:public` evidence after the full command passes.
