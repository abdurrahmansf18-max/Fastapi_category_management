from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

from app.db.provisioning import FREE_PLAN_LIMITS, PLATFORM_DDL, PRO_PLAN_LIMITS, TENANT_DDL

PARAMS = {
    **{f"free_{key}": value for key, value in FREE_PLAN_LIMITS.items()},
    **{f"pro_{key}": value for key, value in PRO_PLAN_LIMITS.items()},
}

PARAM_RE = re.compile(r":([a-z_][a-z0-9_]*)")


def substitute_params(sql: str) -> str:
    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in PARAMS:
            return str(PARAMS[key])
        return match.group(0)

    return PARAM_RE.sub(repl, sql)


def normalize_statement(sql: str) -> str:
    statement = substitute_params(sql.strip())
    if not statement:
        return ""
    if not statement.endswith(";"):
        statement += ";"
    return statement


def render_block(title: str, statements: list[str]) -> str:
    lines = [f"-- {title}"]
    for stmt in statements:
        normalized = normalize_statement(stmt)
        if not normalized:
            continue
        lines.append("")
        lines.append(normalized)
    return "\n".join(lines).rstrip() + "\n"


def checksum(statements: list[str]) -> str:
    raw = "\n".join(stmt.strip() for stmt in statements if stmt.strip())
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_sql() -> str:
    platform_hash = checksum(PLATFORM_DDL)
    tenant_hash = checksum(TENANT_DDL)
    header = "\n".join(
        [
            "-- Auto-generated file. Do not edit manually.",
            "-- Source: app.db.provisioning.PLATFORM_DDL + TENANT_DDL",
            "-- Regenerate: python backend/scripts/generate_schema_sql.py",
            f"-- platform_checksum: {platform_hash}",
            f"-- tenant_template_checksum: {tenant_hash}",
            "",
        ]
    )
    platform = render_block("PUBLIC PLATFORM SCHEMA", PLATFORM_DDL)
    tenant = render_block("TENANT TEMPLATE SCHEMA", TENANT_DDL)
    return header + platform + "\n" + tenant


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate backend/DDL.sql from provisioning source")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parents[1] / "DDL.sql"),
        help="Output SQL file path",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if output differs from current file",
    )
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    content = build_sql()
    existing = output_path.read_text(encoding="utf-8") if output_path.exists() else ""

    if args.check:
        if existing != content:
            print(f"DDL drift detected for {output_path}")
            return 1
        print(f"DDL is up to date: {output_path}")
        return 0

    output_path.write_text(content, encoding="utf-8")
    print(f"Generated {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
