#!/usr/bin/env bash
set -euo pipefail

echo "Starting automatic database migrations..."

# Raw MySQL (from DATABASE_URL or MYSQL_URL) with .sql files
if [[ "${DATABASE_URL:-}" == mysql://* || "${MYSQL_URL:-}" == mysql://* ]]; then
  DBURL="${MYSQL_URL:-${DATABASE_URL:-}}"
  if command -v mysql >/dev/null 2>&1; then
    if ls db/migrations/*.sql >/dev/null 2>&1 || ls migrations/*.sql >/dev/null 2>&1 || ls sql/*.sql >/dev/null 2>&1; then
      echo "Detected raw SQL migrations for MySQL. Applying .sql files..."
      if [[ ! -x "scripts/mysql_from_url.sh" ]]; then
        chmod +x scripts/mysql_from_url.sh || true
      fi
      for dir in db/migrations migrations sql; do
        if [[ -d "$dir" ]]; then
          # Apply files in sorted order
          while IFS= read -r -d '' f; do
            echo "Applying $f"
            scripts/mysql_from_url.sh "$DBURL" < "$f"
          done < <(find "$dir" -maxdepth 1 -type f -name "*.sql" -print0 | sort -z)
        fi
      done
      exit 0
    fi
  else
    echo "mysql client not found. Install it to run raw SQL migrations."
    exit 1
  fi
fi

# Prisma (Node.js)
if [[ -f "prisma/schema.prisma" ]]; then
  echo "Detected Prisma. Running prisma migrate deploy..."
  npx --yes prisma migrate deploy
  exit 0
fi

# Sequelize (Node.js)
if [[ -f "package.json" && ( -d "migrations" || -d "sequelize/migrations" || -f ".sequelizerc" ) ]]; then
  echo "Detected Sequelize. Running migrations..."
  npx --yes sequelize db:migrate || npx --yes sequelize-cli db:migrate
  exit 0
fi

# Django (Python)
if [[ -f "manage.py" ]]; then
  echo "Detected Django. Running manage.py migrate..."
  python manage.py migrate --noinput
  exit 0
fi

# Alembic (Python)
if [[ -f "alembic.ini" || -d "alembic" ]]; then
  echo "Detected Alembic. Running upgrade head..."
  alembic upgrade head
  exit 0
fi

# Rails (Ruby)
if [[ -f "Gemfile" ]]; then
  echo "Detected Rails. Running db:migrate..."
  if [[ -x "bin/rails" ]]; then
    bin/rails db:migrate
  else
    bundle exec rails db:migrate
  fi
  exit 0
fi

# Laravel (PHP)
if [[ -f "artisan" ]]; then
  echo "Detected Laravel. Running php artisan migrate..."
  php artisan migrate --force
  exit 0
fi

# Flyway (Java CLI)
if [[ -f "flyway.conf" || -d "sql" ]]; then
  echo "Detected Flyway. Running flyway migrate..."
  if ! command -v flyway >/dev/null 2>&1; then
    echo "Flyway not found on PATH. Downloading Flyway CLI..."
    curl -sL https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.19.0/flyway-commandline-10.19.0-linux-x64.tar.gz | tar xz
    export PATH="$PWD/flyway-10.19.0:$PATH"
  fi
  flyway migrate
  exit 0
fi

echo "No supported migration tool detected. Please customize scripts/migrate.sh for your stack."
exit 1


