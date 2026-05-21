"""
openFDA HTTP client — shared plumbing for FDA endpoint pipelines.

Owns: HTTP, auth, pagination (skip and search_after), and the AEMS
base-URL adapter. Pipeline-specific logic (manufacturer normalization,
recall severity joins, FAERS report shaping) stays in the pipeline modules
that consume this client.

Two pagination modes:

  paginate_skip()         — `skip`/`limit` paging. openFDA's `skip` is
                            capped at 25,000 records, so use this only
                            for endpoints with <25k matching rows
                            (device/recall, device/enforcement).
  paginate_search_after() — `search_after` cursor paging. Required for
                            endpoints that can exceed the 25k cap (FAERS
                            drug/event has ~20M records).

AEMS migration adapter:

  openFDA's underlying endpoints are migrating to AEMS (device first,
  drug to follow). The `OPENFDA_BASE_URL` env var lets workflows flip
  the host without code changes when cutover lands. Path constants stay
  in this module so the call sites remain greppable.

Environment variables:
    OPENFDA_BASE_URL  optional, default https://api.fda.gov
    OPENFDA_API_KEY   optional; raises rate limit from 1,000/hr to 240/min

Usage:
    from lib.openfda_client import OpenFDAClient, DEVICE_RECALL_PATH

    client = OpenFDAClient()
    for page, total in client.paginate_skip(
        DEVICE_RECALL_PATH,
        search="event_date_initiated:[20240101 TO 20241231]",
        page_size=100,
        max_pages=200,
    ):
        for row in page:
            handle(row)
"""
from __future__ import annotations

import logging
import os
import sys
import time
from typing import Any, Callable, Iterator

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import _retry_sleep  # noqa: E402  reuse jittered backoff

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.fda.gov"

# Endpoint paths. Hosts move under AEMS; paths stay stable.
DEVICE_RECALL_PATH = "/device/recall.json"
DEVICE_ENFORCEMENT_PATH = "/device/enforcement.json"
DEVICE_EVENT_PATH = "/device/event.json"          # MAUDE — deferred
DRUG_EVENT_PATH = "/drug/event.json"              # FAERS — used by PR-3
DRUG_ENFORCEMENT_PATH = "/drug/enforcement.json"

# Retry policy: jittered exponential backoff on 5xx and transient
# network errors. Mirrors _BULK_CHUNK_RETRY_DELAYS in lib/pipeline.py
# but scoped tighter for external HTTP (we don't want a single page
# fetch to block a pipeline for 10+ minutes).
_RETRY_DELAYS: tuple[int, ...] = (2, 5, 15, 45)
_DEFAULT_REQUEST_TIMEOUT = 60


def _err_label(exc: BaseException | None, resp: httpx.Response | None) -> str:
    """Compact label for retry log lines."""
    if resp is not None:
        return f"HTTP {resp.status_code}"
    if exc is not None:
        return type(exc).__name__
    return "unknown"


class OpenFDAClient:
    """Client for openFDA REST endpoints with retry + pagination.

    Env vars are read at instantiation time (not module load) so tests
    and callers can override via constructor args without monkeypatching
    module state.

    Args:
        base_url: Override `OPENFDA_BASE_URL`. Trailing slash stripped.
        api_key: Override `OPENFDA_API_KEY`. Pass `""` to force anonymous.
        request_timeout: Per-request httpx timeout, seconds.
        retry_delays: Override default retry-delay tuple (mostly for tests).
    """

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        request_timeout: int = _DEFAULT_REQUEST_TIMEOUT,
        retry_delays: tuple[int, ...] | None = None,
    ):
        resolved_base = base_url if base_url is not None else os.environ.get("OPENFDA_BASE_URL")
        self.base_url = (resolved_base or DEFAULT_BASE_URL).rstrip("/")

        if api_key is not None:
            self.api_key = api_key or None  # "" → None (force anonymous)
        else:
            self.api_key = os.environ.get("OPENFDA_API_KEY") or None

        self.request_timeout = request_timeout
        self.retry_delays = retry_delays if retry_delays is not None else _RETRY_DELAYS

    # ------------------------------------------------------------------
    # URL + request construction
    # ------------------------------------------------------------------

    def build_url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.base_url}{path}"

    def _build_params(
        self,
        *,
        search: str,
        limit: int,
        skip: int | None,
        sort: str | None,
        search_after: str | None,
        extra: dict[str, Any] | None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"search": search, "limit": limit}
        # `search_after` and `skip` are mutually exclusive. When using
        # cursor paging we omit `skip` entirely.
        if search_after is not None:
            params["search_after"] = search_after
        elif skip is not None:
            params["skip"] = skip
        if sort is not None:
            params["sort"] = sort
        if self.api_key:
            params["api_key"] = self.api_key
        if extra:
            params.update(extra)
        return params

    # ------------------------------------------------------------------
    # Page fetch + retry
    # ------------------------------------------------------------------

    def fetch_page(
        self,
        path: str,
        search: str,
        *,
        skip: int | None = 0,
        limit: int = 100,
        sort: str | None = None,
        search_after: str | None = None,
        extra_params: dict[str, Any] | None = None,
    ) -> tuple[list[dict], int]:
        """Fetch a single page from any openFDA endpoint.

        Returns ``(results, total_hits)``. openFDA returns HTTP 404 when
        a query matches zero records — that surfaces here as ``([], 0)``
        without raising, matching today's `_fetch_page` semantics in the
        recalls pipeline.

        Retries 5xx responses and transient network errors with jittered
        backoff. 4xx other than 404 propagates immediately.
        """
        url = self.build_url(path)
        params = self._build_params(
            search=search, limit=limit, skip=skip, sort=sort,
            search_after=search_after, extra=extra_params,
        )
        resp = self._get_with_retry(url, params=params)
        if resp.status_code == 404:
            return [], 0
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", []) or []
        total = int(data.get("meta", {}).get("results", {}).get("total", 0))
        return results, total

    def _get_with_retry(self, url: str, *, params: dict[str, Any]) -> httpx.Response:
        """GET with retry on 5xx + network errors.

        Returns the final response — caller decides whether to raise.
        404 returns straight through (callers treat as zero results).
        4xx other than 404 returns straight through too; the caller's
        ``raise_for_status`` surfaces the real error without burning
        retries on data-shape problems.

        Each retry attempt is logged at WARNING so transient flakiness
        in openFDA shows up in pipeline run logs.
        """
        last_exc: BaseException | None = None
        last_resp: httpx.Response | None = None
        max_attempts = len(self.retry_delays) + 1
        for attempt in range(max_attempts):
            if attempt > 0:
                delay = self.retry_delays[attempt - 1]
                logger.warning(
                    "openFDA GET retry %d/%d in ~%ds (url=%s, last=%s)",
                    attempt, len(self.retry_delays), delay, url,
                    _err_label(last_exc, last_resp),
                )
                _retry_sleep(delay)
            try:
                resp = httpx.get(url, params=params, timeout=self.request_timeout)
            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
                last_exc = exc
                last_resp = None
                if attempt >= len(self.retry_delays):
                    raise
                continue
            if resp.status_code < 500:
                # Includes 2xx success and 4xx (incl. 404 zero-results).
                return resp
            # 5xx — retry if attempts remain.
            last_resp = resp
            last_exc = None
            if attempt >= len(self.retry_delays):
                return resp  # caller's raise_for_status will surface it
        # Loop exits via return or raise; this is unreachable but keeps
        # type-checkers honest.
        assert last_resp is not None
        return last_resp

    # ------------------------------------------------------------------
    # Pagination
    # ------------------------------------------------------------------

    def paginate_skip(
        self,
        path: str,
        search: str,
        *,
        page_size: int = 100,
        max_pages: int = 200,
        request_delay: float = 0.25,
        sort: str | None = None,
    ) -> Iterator[tuple[list[dict], int]]:
        """Iterate pages via `skip`/`limit`.

        Stops when:
          * an empty page is returned
          * cumulative rows >= total reported by API
          * a short page is returned (less than ``page_size``)
          * ``max_pages`` is reached

        openFDA caps `skip` at 25,000 — for endpoints that can exceed
        that, partition the query (e.g. by date window) so each call
        stays under the cap. The cursor alternative (`search_after`)
        does not work against /drug/event — see the docstring on
        :meth:`paginate_search_after` for the diagnosis.

        ``sort`` is optional. When set, it is passed through to every
        page request so result ordering is deterministic across pages —
        useful for callers that flush partial batches and want stable
        log ordering. Recalls today calls without sort; FAERS uses
        ``receivedate:desc,receiptdate:desc``.

        Yields ``(page_results, total_reported)`` per page. The total is
        the API-reported `meta.results.total` from the first page and is
        reported on every yield for convenience.
        """
        skip = 0
        pages = 0
        total = 0
        while pages < max_pages:
            results, total = self.fetch_page(
                path, search, skip=skip, limit=page_size, sort=sort,
            )
            if not results:
                break
            yield results, total
            skip += len(results)
            pages += 1
            if total and skip >= total:
                break
            if len(results) < page_size:
                break
            time.sleep(request_delay)

    def paginate_search_after(
        self,
        path: str,
        search: str,
        *,
        sort: str,
        page_size: int = 100,
        max_pages: int = 100_000,
        request_delay: float = 0.25,
        cursor_extractor: Callable[[dict, str], Any] | None = None,
        compound_cursor_extractor: Callable[[dict, list[str]], str | None] | None = None,
    ) -> Iterator[tuple[list[dict], int]]:
        """Iterate pages via `search_after` cursor.

        DEAD-BUT-PRESERVED. As of PR #384 / #385 there is NO active
        caller for this function in the codebase. It is kept available
        for endpoints that ship with a working Elasticsearch
        ``search_after`` implementation — AEMS (the announced openFDA
        platform migration) may be one such endpoint.

        Why it's not in production use: openFDA's current /drug/event
        (FAERS) endpoint advertises ``search_after`` but its parser does
        not handle compound cursors. The live API rejects every compound
        request with::

            {"error": {"code": "SERVER_ERROR",
              "details": "[illegal_argument_exception] search_after has
                          1 value(s) but sort has 3."}}

        Two failures combined: (a) the parser treats the cursor string
        as a single value rather than splitting on commas — so a
        ``20241231,20250810`` cursor counts as one value; and (b) the
        backing index silently appends an implicit tiebreaker, raising
        the effective sort arity to 3 fields, but that 3rd field is not
        exposed in response documents so we cannot construct the
        correctly-sized cursor even after fixing (a). FAERS migrated
        to skip-pagination + date-window chunking in PR #385 (see
        ``pipelines/faers_weekly.py``).

        The remainder of the docstring describes the intended contract
        if/when a working endpoint surfaces.

        Required for endpoints that can return more than openFDA's 25k
        ``skip`` cap. Such an endpoint would need a fully-conformant
        ``search_after`` implementation — FAERS is NOT such an endpoint
        despite its size (~20M records); see notice above.

        openFDA's ``search_after`` value is the sort-field value of the
        last record from the prior page. For a single-field sort like
        ``"receivedate:desc"`` the cursor is the receivedate of the last
        result. For a **compound** sort like
        ``"receivedate:desc,safetyreportid:desc"`` the cursor must carry
        every sort field — otherwise pages can collide when many records
        share the same primary sort value (FAERS: hundreds of thousands
        of reports per ``receivedate``, so a single-field cursor of
        ``"20260512"`` re-fetches the same records on every page until
        the safety-cap kicks in).

        Two extractor hooks:

          * ``cursor_extractor`` — single-field override. Signature
            ``(record, field_path) -> Any``. Used when the sort is a
            single field but lives at a non-trivial path the default
            dotted walker can't reach.
          * ``compound_cursor_extractor`` — full multi-field cursor
            builder. Signature ``(record, sort_field_paths) -> str | None``.
            Returns the assembled ``search_after`` string (typically
            comma-separated to mirror the sort expression). Discovered
            during FAERS integration (PR-3) where ``receivedate``
            collisions otherwise stall pagination.

        If both are passed, ``compound_cursor_extractor`` wins. If
        neither is passed and ``sort`` has multiple fields, the default
        is the single-field extractor on the FIRST sort field — usually
        wrong for high-collision keys; pass ``compound_cursor_extractor``.

        Args:
            path: endpoint path (e.g. ``DRUG_EVENT_PATH``).
            search: openFDA ``search=`` expression.
            sort: openFDA ``sort=`` expression — REQUIRED. Cursor paging
                  is meaningless without a stable sort key.
            page_size: per-request ``limit``.
            max_pages: safety cap on total pages fetched.
            request_delay: polite pacing between pages.
            cursor_extractor: optional single-field override.
            compound_cursor_extractor: optional multi-field cursor builder
                                       for compound sorts.
        """
        if not sort:
            raise ValueError("paginate_search_after requires a non-empty sort= expression")

        sort_fields = [seg.split(":")[0].strip() for seg in sort.split(",") if seg.strip()]
        primary_field = sort_fields[0]
        single_extractor = cursor_extractor or _default_cursor_extractor

        cursor: str | None = None
        pages = 0
        total = 0
        while pages < max_pages:
            results, total = self.fetch_page(
                path, search, skip=None, limit=page_size,
                sort=sort, search_after=cursor,
            )
            if not results:
                break
            yield results, total
            pages += 1
            if len(results) < page_size:
                break

            if compound_cursor_extractor is not None:
                next_cursor = compound_cursor_extractor(results[-1], sort_fields)
            else:
                cursor_val = single_extractor(results[-1], primary_field)
                next_cursor = None if cursor_val is None else str(cursor_val)

            if next_cursor is None or next_cursor == "":
                logger.warning(
                    "search_after cursor came back empty (sort=%r) — "
                    "stopping pagination to avoid an infinite loop", sort,
                )
                break
            cursor = next_cursor
            time.sleep(request_delay)


def _default_cursor_extractor(record: dict, field_path: str) -> Any:
    """Walk a dotted field path through nested dicts.

    openFDA records nest some fields (e.g. ``patient.drug``). For a
    field like ``"receivedate"`` this just returns ``record["receivedate"]``;
    for ``"patient.patientonsetage"`` it descends.
    """
    cur: Any = record
    for part in field_path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
        if cur is None:
            return None
    return cur
