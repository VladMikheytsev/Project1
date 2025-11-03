#!/usr/bin/env bash
set -euo pipefail

echo "[start] Starting service..."

# 0) Ensure DATABASE_URL/MYSQL_URL from Railway MYSQL* envs
if [[ -z "${DATABASE_URL:-}" ]] && [[ -n "${MYSQLHOST:-}" ]] && [[ -n "${MYSQLUSER:-}" ]] && [[ -n "${MYSQLPASSWORD:-}" ]] && [[ -n "${MYSQLDATABASE:-}" ]]; then
  export DATABASE_URL="mysql://${MYSQLUSER}:${MYSQLPASSWORD}@${MYSQLHOST}:${MYSQLPORT:-3306}/${MYSQLDATABASE}"
  export MYSQL_URL="$DATABASE_URL"
  echo "[start] Constructed DATABASE_URL from Railway MYSQL* envs"
fi

# 1) Run DB migrations if script exists
if [[ -x "scripts/migrate.sh" ]]; then
  echo "[start] Running migrations"
  if ! scripts/migrate.sh; then
    echo "[start] Migrations failed or not applicable; continuing"
  fi
fi

# 2) Try to start common stacks

# Node.js (detect lockfile and run start script if present)
if [[ -f "package.json" ]]; then
  if grep -q '"start"' package.json; then
    if [[ -f "pnpm-lock.yaml" ]]; then
      echo "[start] Detected pnpm project"
      exec pnpm start
    elif [[ -f "yarn.lock" ]]; then
      echo "[start] Detected yarn project"
      exec yarn start
    else
      echo "[start] Detected npm project"
      exec npm run start --if-present
    fi
  fi
fi

# Django (development server as fallback)
if [[ -f "manage.py" ]]; then
  echo "[start] Detected Django project"
  exec python manage.py runserver 0.0.0.0:${PORT:-3000}
fi

# Rails
if [[ -f "Gemfile" ]]; then
  echo "[start] Detected Rails project"
  if [[ -x "bin/rails" ]]; then
    exec bin/rails server -b 0.0.0.0 -p ${PORT:-3000}
  else
    exec bundle exec rails server -b 0.0.0.0 -p ${PORT:-3000}
  fi
fi

# Laravel (PHP dev server as fallback)
if [[ -f "artisan" ]]; then
  echo "[start] Detected Laravel project"
  exec php artisan serve --host 0.0.0.0 --port ${PORT:-8080}
fi

# 3) Fallback: keep container alive so Railway doesn't fail the deploy
echo "[start] No recognized app start found. Keeping container alive."
exec tail -f /dev/null


