"""SwitchableLLM: proxy that auto-switches between Ollama and OpenAI based on latency."""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from typing import Callable, Coroutine, Optional

from livekit.agents import llm as agents_llm

logger = logging.getLogger(__name__)


class SwitchableLLM(agents_llm.LLM):
    """Proxies chat() to one of two LLM backends and can switch between them.

    Auto-switch logic (disabled when manual override is active):
      - Track rolling average of LLM latency over the last `window` turns.
      - If rolling avg > threshold_ms → switch to OpenAI.
      - After `revert_after` turns on OpenAI → revert to Ollama.

    Manual override via set_override() locks the backend until cleared.
    """

    def __init__(
        self,
        ollama_llm: agents_llm.LLM,
        openai_llm: agents_llm.LLM,
        *,
        initial_mode: str = "openai",
        threshold_ms: float = 1500.0,
        window: int = 5,
        revert_after: int = 10,
        on_switch: Optional[Callable[[str], Coroutine]] = None,
    ) -> None:
        super().__init__()
        self._ollama = ollama_llm
        self._openai = openai_llm
        self._threshold_ms = threshold_ms
        self._window = window
        self._revert_after = revert_after
        self._on_switch = on_switch

        self._latencies: deque[float] = deque(maxlen=window)
        self._turns_on_openai = 0
        self._manual = False

        # Set initial mode
        self._mode = initial_mode
        self._active = self._openai if initial_mode == "openai" else self._ollama

    # ── LLM interface ─────────────────────────────────────────────────────────

    def chat(self, *, chat_ctx, tools=None, **kwargs):
        active = self._active  # CPython atomic read
        # Ollama small models can't reliably handle structured tool calls
        effective_tools = None if self._mode == "ollama" else tools
        return active.chat(chat_ctx=chat_ctx, tools=effective_tools, **kwargs)

    @property
    def model(self) -> str:
        return getattr(self._active, "model", self._mode)

    @property
    def provider(self) -> str:
        return self._mode

    # ── Latency tracking ──────────────────────────────────────────────────────

    def record_llm_latency(self, ms: float) -> None:
        """Call after each LLM turn with the measured latency in milliseconds."""
        if self._mode == "ollama":
            self._latencies.append(ms)
        self._maybe_auto_switch()

    # ── Override API ──────────────────────────────────────────────────────────

    def set_override(self, provider: str, model: Optional[str] = None) -> str:
        """Manual frontend override. Returns new label string."""
        self._manual = True
        if provider == "openai":
            if model:
                try:
                    self._openai._opts.model = model  # type: ignore[attr-defined]
                except AttributeError:
                    pass
            self._do_switch_sync("openai")
        else:
            if model:
                try:
                    self._ollama._opts.model = model  # type: ignore[attr-defined]
                except AttributeError:
                    pass
            self._do_switch_sync("ollama")
        return self.current_label()

    def clear_override(self) -> None:
        self._manual = False

    def current_label(self) -> str:
        suffix = "(manual)" if self._manual else "(auto)"
        if self._mode == "ollama":
            ollama_model = getattr(getattr(self._ollama, "_opts", None), "model", "ollama")
            return f"Ollama {ollama_model} local {suffix}"
        openai_model = getattr(getattr(self._openai, "_opts", None), "model", "gpt-4.1")
        return f"OpenAI {openai_model} {suffix}"

    # ── Internal ──────────────────────────────────────────────────────────────

    def _maybe_auto_switch(self) -> None:
        if self._manual:
            return
        if self._mode == "ollama":
            if len(self._latencies) == self._latencies.maxlen:
                avg = sum(self._latencies) / len(self._latencies)
                if avg > self._threshold_ms:
                    logger.warning(
                        "SwitchableLLM: Ollama rolling avg %.0fms > %.0fms threshold — switching to OpenAI",
                        avg,
                        self._threshold_ms,
                    )
                    self._do_switch_sync("openai")
                    self._turns_on_openai = 0
        elif self._mode == "openai":
            self._turns_on_openai += 1
            if self._turns_on_openai >= self._revert_after:
                logger.info(
                    "SwitchableLLM: %d turns on OpenAI — reverting to Ollama",
                    self._revert_after,
                )
                self._latencies.clear()
                self._do_switch_sync("ollama")
                self._turns_on_openai = 0

    def _do_switch_sync(self, to: str) -> None:
        prev = self._mode
        self._mode = to
        self._active = self._openai if to == "openai" else self._ollama
        if prev != to:
            logger.info("SwitchableLLM: switched %s → %s", prev, to)
        if self._on_switch:
            asyncio.create_task(self._on_switch(self.current_label()))
