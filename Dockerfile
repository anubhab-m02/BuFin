# BuFin local stack: API (Python) + static web (nginx)
FROM python:3.12-slim AS api
WORKDIR /app
RUN useradd --create-home --uid 10001 appuser
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ /app/
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM node:22-alpine AS web-build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS web
COPY --from=web-build /web/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
