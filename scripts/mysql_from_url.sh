#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/mysql_from_url.sh "mysql://user:pass@host:port/db" [mysql args]
# Reads SQL from stdin if provided, or runs interactive mysql if no stdin and no -e/file args.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 mysql://user:pass@host:port/db [mysql args]" >&2
  exit 2
fi

MYSQL_URL="$1"
shift || true

if [[ "$MYSQL_URL" != mysql://* ]]; then
  echo "Error: URL must start with mysql://" >&2
  exit 2
fi

# Strip scheme
url_no_scheme="${MYSQL_URL#mysql://}"

# Split auth and rest
auth_part="${url_no_scheme%%@*}"
host_db_part="${url_no_scheme#*@}"

# Username and password
username="${auth_part%%:*}"
password="${auth_part#*:}"

# Host:port and db
host_port_part="${host_db_part%%/*}"
database="${host_db_part#*/}"

host="${host_port_part%%:*}"
port="${host_port_part#*:}"
if [[ "$host_port_part" == "$port" ]]; then
  # No colon → no port
  port=""
fi

cmd=(mysql -h "$host" -u "$username" --password="$password" --protocol=TCP "$database")
if [[ -n "$port" ]]; then
  cmd+=(--port="$port")
fi

exec "${cmd[@]}" "$@"


