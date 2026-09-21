#!/usr/bin/env python3
"""Manage Shioaji Pro watchlists through its local production API.

Examples:
  python3 examples/watchlist_api.py list
  python3 examples/watchlist_api.py replace --name 每日觀察 --contracts STK:2330,STK:2317
  python3 examples/watchlist_api.py append --name 每日觀察 --contracts STK:2454
  python3 examples/watchlist_api.py remove --name 每日觀察 --contracts STK:2454

Override the Desktop sidecar default when necessary:
  SHIOAJI_SERVER=https://127.0.0.1:21322 python3 examples/watchlist_api.py list
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = os.environ.get("SHIOAJI_SERVER", "http://127.0.0.1:21322").rstrip("/")
VALID_SECURITY_TYPES = frozenset({"IND", "STK", "FUT", "OPT", "WRT"})


def api(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    request = Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=15) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"{method} {path} failed: HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Cannot connect to {BASE_URL}: {error.reason}") from error


def parse_contract_specs(raw: str) -> list[tuple[str, str]]:
    specs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for part in raw.split(","):
        security_type, separator, code = part.strip().upper().partition(":")
        if not separator or not code or security_type not in VALID_SECURITY_TYPES:
            allowed = ", ".join(sorted(VALID_SECURITY_TYPES))
            raise ValueError(f"Invalid contract {part!r}; use TYPE:CODE, TYPE one of {allowed}")
        key = (security_type, code)
        if key not in seen:
            seen.add(key)
            specs.append(key)
    if not specs:
        raise ValueError("At least one contract is required")
    return specs


def resolve_contract(security_type: str, code: str) -> dict[str, Any]:
    """Ask the server for its authoritative contract key; never guess exchange."""
    query = urlencode({"security_type": security_type, "region": "TW"})
    contract = api("GET", f"/api/v1/data/contracts/{code}?{query}")
    return {
        "security_type": contract["security_type"],
        "region": contract.get("region", "TW"),
        "exchange": contract["exchange"],
        "code": contract["code"],
        "target_code": contract.get("target_code"),
    }


def unique_list_by_name(name: str) -> dict[str, Any] | None:
    matches = [watchlist for watchlist in api("GET", "/api/v1/watchlist") if watchlist["name"] == name]
    if len(matches) > 1:
        raise RuntimeError(f"Found {len(matches)} watchlists named {name!r}; refusing to mutate")
    return matches[0] if matches else None


def print_watchlists() -> None:
    for watchlist in api("GET", "/api/v1/watchlist"):
        codes = ", ".join(contract["code"] for contract in watchlist["contracts"])
        print(f"{watchlist['id']}\t{watchlist['name']}\t{codes}")


def mutate(mode: str, name: str, contract_specs: str) -> None:
    contracts = [resolve_contract(*spec) for spec in parse_contract_specs(contract_specs)]
    watchlist = unique_list_by_name(name)

    if mode == "replace":
        if watchlist is None:
            result = api("POST", "/api/v1/watchlist", {"name": name, "contracts": contracts})
            action = "created"
        else:
            result = api("PUT", f"/api/v1/watchlist/{watchlist['id']}", {"contracts": contracts})
            action = "replaced"
    else:
        if watchlist is None:
            raise RuntimeError(f"Watchlist {name!r} does not exist; use replace to create it")
        endpoint = f"/api/v1/watchlist/{watchlist['id']}/contracts"
        method = "POST" if mode == "append" else "DELETE"
        result = api(method, endpoint, {"contracts": contracts})
        action = "appended to" if mode == "append" else "removed from"

    print(f"{action.capitalize()} {result['name']!r}: {len(result['contracts'])} contracts")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("list", help="list existing watchlists")
    for command, help_text in (
        ("replace", "create a named watchlist or replace all of its contracts"),
        ("append", "append contracts to an existing watchlist"),
        ("remove", "remove contracts from an existing watchlist"),
    ):
        command_parser = subparsers.add_parser(command, help=help_text)
        command_parser.add_argument("--name", required=True, help="exact watchlist name")
        command_parser.add_argument("--contracts", required=True, help="comma-separated TYPE:CODE values")
    args = parser.parse_args()

    api("GET", "/api/v1/health")
    if args.command == "list":
        print_watchlists()
    else:
        mutate(args.command, args.name, args.contracts)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, KeyError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
