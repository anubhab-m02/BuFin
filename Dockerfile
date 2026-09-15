# BuFin local dev: Vite frontend (build) served via a simple static stage optional;
# default target runs the Python API. See README for docker-compose style usage.
FROM python:3.12-slim AS api
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ /app/
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM node:22-alpine AS web-build
WORKDIR /web
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS web
COPY --from=web-build /web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
