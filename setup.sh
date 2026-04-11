#!/usr/bin/env bash
set -euo pipefail

REQUIRED_MAJOR=3
REQUIRED_MINOR=12
VENV_DIR=".venv"

# ---------- find python ----------
PYTHON=""
for candidate in python3.12 python3 python; do
    if command -v "$candidate" &>/dev/null; then
        PYTHON="$candidate"
        break
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: Python not found. Install Python ${REQUIRED_MAJOR}.${REQUIRED_MINOR}+ and try again."
    exit 1
fi

# ---------- check version ----------
PY_VERSION=$("$PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=$("$PYTHON" -c "import sys; print(sys.version_info.major)")
PY_MINOR=$("$PYTHON" -c "import sys; print(sys.version_info.minor)")

if [ "$PY_MAJOR" -lt "$REQUIRED_MAJOR" ] || \
   { [ "$PY_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$PY_MINOR" -lt "$REQUIRED_MINOR" ]; }; then
    echo "ERROR: Python ${REQUIRED_MAJOR}.${REQUIRED_MINOR}+ required, found ${PY_VERSION}."
    echo "Install it via pyenv:  pyenv install ${REQUIRED_MAJOR}.${REQUIRED_MINOR}"
    exit 1
fi

echo "Using $PYTHON ($PY_VERSION)"

# ---------- create venv ----------
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in ${VENV_DIR}/ ..."
    "$PYTHON" -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists at ${VENV_DIR}/"
fi

# ---------- install deps ----------
echo "Installing dependencies ..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -r requirements.txt --quiet

# ---------- .env ----------
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env from .env.example — fill in your secrets before running the app."
    else
        echo "WARNING: .env.example not found. Create a .env file manually."
    fi
else
    echo ".env already exists, skipping."
fi

# ---------- done ----------
echo ""
echo "Setup complete! Next steps:"
echo "  source ${VENV_DIR}/bin/activate"
echo "  uvicorn app.main:app --reload"
