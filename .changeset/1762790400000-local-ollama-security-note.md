---
type: fix
date: 2026-03-06T10:00:00.000Z
branch: feat/local-llm-loopback-toggle-and-compact-settings
---

Unify local model support under a single Local LLM provider (Ollama, LM Studio, and OpenAI-compatible servers) with configurable API format.

Before: "local" Ollama URL could be any host, so misconfiguration could send tab metadata to a remote endpoint.

Now Local LLM URLs are restricted to loopback hosts by default (`localhost`, `127.0.0.1`, `[::1]`), with an explicit settings toggle to allow remote URLs when intentionally needed.
