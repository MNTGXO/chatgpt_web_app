# syntax=docker/dockerfile:1
# ─── Builder Stage ───────────────────────────────────────
FROM golang:1.20-alpine AS builder
WORKDIR /app

# 1) Copy in go.mod & go.sum, download deps
COPY go.mod go.sum ./
RUN go mod download

# 2) Copy source and build
COPY . .
RUN go build -o server

# ─── Final Stage ─────────────────────────────────────────
FROM alpine:latest
WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/static ./static

EXPOSE 8080
CMD ["./server"]
