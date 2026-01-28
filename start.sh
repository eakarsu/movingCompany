#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_NAME="movingcompany"

echo "=========================================="
echo "  Moving Company AI Platform"
echo "=========================================="
echo ""

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  # Use current system username for PostgreSQL connection (common on macOS)
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"

# Set other required environment variables with defaults
export JWT_SECRET="${JWT_SECRET:-moving-company-dev-secret-change-in-production}"
export NODE_ENV="${NODE_ENV:-development}"

echo "Backend Port: ${BACKEND_PORT}"
echo "Frontend Port: ${FRONTEND_PORT}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server (not specific database)
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on the ports
echo ""
echo "==> Cleaning up processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
for port in ${BACKEND_PORT} ${FRONTEND_PORT}; do
  if lsof -ti tcp:"${port}" >/dev/null 2>&1; then
    echo "Found processes on port ${port}, killing them..."
    lsof -ti tcp:"${port}" | xargs kill -9 || true
    sleep 1
    echo "Processes on port ${port} have been terminated."
  else
    echo "No processes found on port ${port}."
  fi
done

# Navigate to backend directory
echo ""
echo "==> Setting up backend..."
cd backend

# Check if node_modules exists for backend
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
else
  echo "Backend dependencies already installed."
fi

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  # Update DATABASE_URL in .env if it exists, otherwise append
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="${JWT_SECRET}"
PORT=${BACKEND_PORT}
NODE_ENV=${NODE_ENV}

# OpenRouter AI Configuration
OPENROUTER_API_KEY="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"
OPENROUTER_MODEL="anthropic/claude-3-haiku"
EOF
fi
echo ".env file updated."

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${USER_COUNT}" = "0" ] || [ -z "${USER_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  node prisma/seed.js
else
  echo "Database already contains data (${USER_COUNT} users). Skipping seed."
fi

cd ..

# Navigate to frontend directory
echo ""
echo "==> Setting up frontend..."
cd frontend

# Check if node_modules exists for frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
else
  echo "Frontend dependencies already installed."
fi

cd ..

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "==> Stopping servers..."
  if [ -n "${BACKEND_PID:-}" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  echo "Servers stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start the application
echo ""
echo "=========================================="
echo "  Starting Moving Company AI Platform"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Demo login credentials:"
echo "  Email:    admin@movingcompany.com"
echo "  Password: admin123"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend
echo "==> Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "==> Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for processes
wait
