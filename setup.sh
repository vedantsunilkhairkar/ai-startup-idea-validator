#!/usr/bin/env bash
# ==============================================================================
# PitchProof — Full-Stack Setup & Development Runner
# ==============================================================================
# Sets up dependencies for both Backend (FastAPI) and Frontend (React/TanStack)
# and runs both services simultaneously with graceful process management.
# ==============================================================================

set -e

# Terminal styling
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}       🚀 PitchProof — Full-Stack Setup & Launch Script       ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

# ------------------------------------------------------------------------------
# STEP 1: Verify System Prerequisites
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}${BOLD}[1/5] Checking system prerequisites...${NC}"

# Python 3 check
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    echo -e "${GREEN}✓ Python ${PY_VER} found${NC}"
else
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11 or newer.${NC}"
    exit 1
fi

# Package manager for Python (uv or standard pip)
if command -v uv &>/dev/null; then
    UV_BIN="uv"
    echo -e "${GREEN}✓ uv package manager found${NC}"
elif [ -f "${HOME}/.local/bin/uv" ]; then
    UV_BIN="${HOME}/.local/bin/uv"
    echo -e "${GREEN}✓ uv found at ${UV_BIN}${NC}"
else
    echo -e "${YELLOW}! uv not detected. Attempting automatic installation...${NC}"
    if curl -LsSf https://astral.sh/uv/install.sh | sh 2>/dev/null; then
        export PATH="${HOME}/.local/bin:${PATH}"
        UV_BIN="${HOME}/.local/bin/uv"
        echo -e "${GREEN}✓ uv installed successfully${NC}"
    else
        UV_BIN=""
        echo -e "${YELLOW}! uv could not be installed; falling back to python venv/pip.${NC}"
    fi
fi

# Frontend package manager (bun or npm)
if command -v bun &>/dev/null; then
    JS_PKG="bun"
    echo -e "${GREEN}✓ Bun package manager found ($(${JS_PKG} --version))${NC}"
elif [ -f "${HOME}/.bun/bin/bun" ]; then
    export PATH="${HOME}/.bun/bin:${PATH}"
    JS_PKG="bun"
    echo -e "${GREEN}✓ Bun found at ${HOME}/.bun/bin/bun${NC}"
elif command -v npm &>/dev/null; then
    JS_PKG="npm"
    echo -e "${GREEN}✓ Node.js & npm found ($(${JS_PKG} --version))${NC}"
else
    echo -e "${YELLOW}! Bun not detected. Installing Bun for ultra-fast frontend tooling...${NC}"
    if curl -fsSL https://bun.sh/install | bash 2>/dev/null; then
        export PATH="${HOME}/.bun/bin:${PATH}"
        JS_PKG="bun"
        echo -e "${GREEN}✓ Bun installed successfully${NC}"
    else
        echo -e "${RED}✗ Neither Bun nor npm found. Please install Bun (https://bun.sh) or Node.js.${NC}"
        exit 1
    fi
fi

# MongoDB Service Verification
echo -e "\n${YELLOW}${BOLD}[2/5] Checking MongoDB database connection...${NC}"
MONGO_RUNNING=false
if python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); r = s.connect_ex(('127.0.0.1', 27017)); s.close(); exit(r)" 2>/dev/null; then
    MONGO_RUNNING=true
fi

if [ "$MONGO_RUNNING" = true ]; then
    echo -e "${GREEN}✓ MongoDB is running and listening on localhost:27017${NC}"
else
    echo -e "${YELLOW}! MongoDB port 27017 is not responding. Checking mongod daemon...${NC}"
    if command -v mongod &>/dev/null; then
        if command -v systemctl &>/dev/null; then
            echo -e "${YELLOW}Attempting to start mongod service via systemctl...${NC}"
            sudo systemctl start mongod 2>/dev/null || true
        fi
    fi
    if python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); r = s.connect_ex(('127.0.0.1', 27017)); s.close(); exit(r)" 2>/dev/null; then
        echo -e "${GREEN}✓ MongoDB started successfully${NC}"
    else
        echo -e "${YELLOW}! Warning: MongoDB on port 27017 is not active. Please ensure MongoDB is started if using local database.${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# STEP 2: Setup Backend Dependencies & Configuration
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}${BOLD}[3/5] Setting up Backend dependencies & environment...${NC}"
cd "${BACKEND_DIR}"

if [ ! -f "${BACKEND_DIR}/.env" ]; then
    if [ -f "${BACKEND_DIR}/.env.example" ]; then
        echo -e "${CYAN}Creating backend/.env from backend/.env.example...${NC}"
        cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
        echo -e "${GREEN}✓ Created backend/.env${NC}"
    fi
else
    echo -e "${GREEN}✓ backend/.env already exists${NC}"
fi

if [ -n "${UV_BIN}" ] && command -v "${UV_BIN}" &>/dev/null; then
    echo -e "${CYAN}Syncing backend packages with uv...${NC}"
    "${UV_BIN}" sync
    echo -e "${GREEN}✓ Backend dependencies installed into backend/.venv${NC}"
    PYTHON_EXEC="${BACKEND_DIR}/.venv/bin/python"
    UVICORN_CMD="${UV_BIN} run uvicorn app.main:app --app-dir src --reload-dir src --host 0.0.0.0 --port 8000 --reload"
else
    if [ ! -d "${BACKEND_DIR}/.venv" ]; then
        echo -e "${CYAN}Creating Python virtual environment...${NC}"
        python3 -m venv "${BACKEND_DIR}/.venv"
    fi
    PYTHON_EXEC="${BACKEND_DIR}/.venv/bin/python"
    echo -e "${CYAN}Installing backend requirements with pip...${NC}"
    "${PYTHON_EXEC}" -m pip install --upgrade pip
    "${PYTHON_EXEC}" -m pip install -r requirements.txt
    echo -e "${GREEN}✓ Backend dependencies installed with pip${NC}"
    UVICORN_CMD="${PYTHON_EXEC} -m uvicorn app.main:app --app-dir src --reload-dir src --host 0.0.0.0 --port 8000 --reload"
fi

# Initialize MongoDB schema and unique indexes
echo -e "${CYAN}Verifying MongoDB indexes...${NC}"
"${PYTHON_EXEC}" -c "import sys; sys.path.insert(0, 'src'); import asyncio; from app.database import setup_database; ok = asyncio.run(setup_database()); print('✓ Database indexes active' if ok else '! Database index initialization bypassed')" 2>/dev/null || echo -e "${YELLOW}! Note: MongoDB connection skipped or running remotely.${NC}"

# ------------------------------------------------------------------------------
# STEP 3: Setup Frontend Dependencies & Configuration
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}${BOLD}[4/5] Setting up Frontend dependencies & environment...${NC}"
cd "${FRONTEND_DIR}"

if [ ! -f "${FRONTEND_DIR}/.env" ]; then
    if [ -f "${FRONTEND_DIR}/.env.example" ]; then
        cp "${FRONTEND_DIR}/.env.example" "${FRONTEND_DIR}/.env"
        echo -e "${GREEN}✓ Created frontend/.env from .env.example${NC}"
    else
        echo "VITE_API_BASE_URL=http://localhost:8000/api" > "${FRONTEND_DIR}/.env"
        echo -e "${GREEN}✓ Created frontend/.env with default backend URL${NC}"
    fi
else
    echo -e "${GREEN}✓ frontend/.env already exists${NC}"
fi

echo -e "${CYAN}Installing frontend dependencies with ${JS_PKG}...${NC}"
if [ "${JS_PKG}" = "bun" ]; then
    bun install
    FRONTEND_DEV_CMD="bun run dev --host 0.0.0.0 --port 5173"
else
    npm install
    FRONTEND_DEV_CMD="npm run dev -- --host 0.0.0.0 --port 5173"
fi
echo -e "${GREEN}✓ Frontend dependencies installed successfully${NC}"

# ------------------------------------------------------------------------------
# STEP 4: Concurrently Launch Both Servers
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}${BOLD}[5/5] Launching Backend & Frontend services...${NC}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Shutting down PitchProof development servers...${NC}"
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        kill "${FRONTEND_PID}" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ All services stopped cleanly. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend
cd "${BACKEND_DIR}"
echo -e "${CYAN}Starting FastAPI backend on port 8000...${NC}"
${UVICORN_CMD} &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# Start frontend
cd "${FRONTEND_DIR}"
echo -e "${CYAN}Starting React / TanStack frontend on port 5173...${NC}"
${FRONTEND_DEV_CMD} &
FRONTEND_PID=$!

echo -e "\n${BLUE}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}       ✨ PitchProof is up and running!                      ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "  🌐 ${BOLD}Web Client (UI):${NC}       ${CYAN}http://localhost:5173${NC}"
echo -e "  ⚡ ${BOLD}FastAPI Backend:${NC}       ${CYAN}http://localhost:8000${NC}"
echo -e "  📖 ${BOLD}API Docs (Swagger):${NC}    ${CYAN}http://localhost:8000/docs${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "Press ${BOLD}Ctrl+C${NC} anytime to stop both servers.\n"

# Wait for background processes to keep script running
wait "${BACKEND_PID}" "${FRONTEND_PID}"
