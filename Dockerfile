
FROM python:3.12-slim

WORKDIR /app

# ============================================================
# SYSTEM DEPENDENCIES
# ============================================================

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# PYTHON DEPENDENCIES
# ============================================================

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ============================================================
# APPLICATION FILES
# ============================================================

COPY . .

EXPOSE 8001

# ============================================================
# START DJANGO ASGI SERVER
# ============================================================

CMD ["daphne", "-e", "ssl:8001:privateKey=key.pem:certKey=cert.pem", "my_school.asgi:application"]
