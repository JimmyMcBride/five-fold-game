# Seeded RNG And Replayability

Status: accepted bootstrap architecture.

Randomness enters the pure engine through a seeded `RandomSource`. Same starting state, command sequence, and seed/RNG state must reproduce the same next states and events. Future persisted snapshots and append-only command/event history must retain enough RNG state for replay and diagnosis.
