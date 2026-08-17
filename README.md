# File Storage App — Backend

## Overview

NestJS backend for the File Storage application.

The API handles:

- Authentication and users
- Files and folders
- Upload initialization/completion
- Downloads and sharing
- File/folder movement, updates, and deletion
- File type validation
- MinIO presigned URLs

The backend stores metadata in PostgreSQL and actual file contents in MinIO.

---

## Setup

### Requirements

- Node.js 20+
- npm
- Docker and Docker Compose

PostgreSQL and MinIO are already included in the repository's `docker-compose.yml`.

### Install

```bash
npm install
```

### Environment

Create `.env` in the backend root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/file_management_db?schema=public"


PORT="4000"

JWT_SECRET="your-development-secret"

APP_URL="http://localhost:3000"

S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="file-storage"

SHARE_EXPIRY_HOURS=24

S3_QUARANTINE_BUCKET="file-storage-quarantine"
```

Use the exact variable names expected by the project configuration.

### Start infrastructure

From the backend directory:

```bash
docker compose up -d
```

This starts PostgreSQL and MinIO.

MinIO API:

`http://localhost:9000`

MinIO Console:

`http://localhost:9001` or `http://localhost:9001/browser`

The application uses the `file-storage` bucket.

If the bucket is not created automatically by the existing Compose setup, create it once from the MinIO console.

### Database and API

```bash
npx prisma generate
npx prisma migrate dev
npm run start
```

The API runs at:

`http://localhost:4000`

---

## Architecture Decisions

### PostgreSQL + Prisma

PostgreSQL stores application metadata:

- Users
- Files
- Folders
- Ownership
- Folder relationships
- Storage keys
- Upload status
- Share information

Prisma provides a typed database layer and keeps the data model explicit.

Files themselves are not stored in PostgreSQL because object storage is better suited for large binary data.

### MinIO

MinIO provides S3-compatible object storage locally.

The backend generates presigned URLs, allowing the client to upload/download directly from MinIO instead of sending large files through NestJS.

This reduces API bandwidth and makes the storage layer easier to scale.

The tradeoff is that the API does not inspect the entire file during transfer, so stronger content inspection would be required in production.

### Upload lifecycle

Uploads use:

**Initialize → Direct MinIO upload → Complete**

The backend creates the file metadata and presigned URL during initialization. After the client uploads the object, the completion endpoint verifies the upload and marks the file as ready.

This prevents an upload URL from being treated as proof that a file actually exists.

### Authorization

JWT authentication protects user resources. Ownership is determined from the authenticated user rather than trusting a user ID supplied by the client.

---

## What I'd Do Differently

With more time, I would add:

- Multipart/resumable uploads for large files
- Malware and deeper file-content scanning
- Background workers for thumbnails and post-upload processing
- Storage reconciliation for orphaned database/object-storage records
- More comprehensive unit, integration, and E2E tests
- Structured logging, metrics, and error monitoring
- Swagger/OpenAPI documentation
- More advanced sharing permissions and audit logs

---

## What We Cut

To keep the implementation focused and runnable in minutes, I intentionally did not add:

**Malware scanning** — requires additional infrastructure and asynchronous processing.

**Resumable uploads** — unnecessary for the expected file sizes and scope.

**Dedicated search infrastructure** — PostgreSQL is sufficient for the current requirements.

**Advanced sharing permissions** — the assessment only requires basic shareable access.

**Audit logging** — useful for production but not required for the core file-management workflow.

**Redis/caching** — would add infrastructure without meaningful value at the current scale.

The goal was to demonstrate a clean file-storage architecture without over-engineering the solution.
