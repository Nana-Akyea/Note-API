# BeTechified Group 1 — Personal Knowledge Base API

A REST API for a personal notes service, built with Node.js, Express, MongoDB Atlas, and Mongoose. Users register and log in to manage their own notes.

## Features

- JWT authentication
- Create, list, retrieve, update, and delete notes
- User-owned notes: a user can only access their own notes
- Pagination with `page` and `limit`
- Sorting with `sort`
- Text search across note titles and content using `search` or `q`
- Optional category and tag filters
- Request validation and JSON error responses

## Requirements

- Node.js and npm
- A MongoDB database, such as MongoDB Atlas

## Run locally

From the project directory:

```bash
npm install
```

Create a private `.env` file in this directory. You can use `.env.example` as a reference, but replace its example values:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET_KEY=<a-long-random-secret>
JWT_EXPIRES=1d
```

Generate a random JWT secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit `.env` or share its contents. Start the development server with:

```bash
npm run dev
```

The API listens on the configured `PORT` (3000 by default). `GET /` returns a basic health response and endpoint hints.

## Run tests

Run the authentication, request-validation, owner-scoped CRUD, note-query, and error-response tests with:

```bash
npm test
```

## Authentication

Register a user:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Alex Example",
  "email": "alex@example.com",
  "password": "a-long-password"
}
```

Log in with `POST /api/auth/login` and the same `email` and `password` fields. Both endpoints return a JWT in the `token` field. Include it on every notes request:

```http
Authorization: Bearer <token>
```

## Notes API

All note endpoints require a valid bearer token.

### Create a note

`POST /api/notes`

```json
{
  "title": "Meeting notes",
  "content": "Discuss the project milestones.",
  "category": "Work",
  "tags": ["planning", "team"]
}
```

`title` and `content` are required. `category` and `tags` are optional.

### List notes

`GET /api/notes?page=1&limit=10&sort=-createdAt`

Supported sort fields are `createdAt`, `updatedAt`, `title`, and `category`. Prefix a field with `-` for descending order. The default is `-createdAt`; page defaults to 1 and limit defaults to 10, with a maximum limit of 100.
If `page` or `limit` is supplied, it must be a positive integer; invalid values return `400`.

Search titles and content with either `search` or `q`:

```http
GET /api/notes?search=project&page=1&limit=10
GET /api/notes?q=milestones&sort=-updatedAt
```

Filter by category or tag:

```http
GET /api/notes?category=Work
GET /api/notes?tag=planning
```

Filters can be combined with search, pagination, and sorting:

```http
GET /api/notes?search=project&category=Work&tag=planning&page=1&limit=5&sort=-updatedAt
```

The list response includes `page`, `limit`, `total`, `totalPages`, `count`, and `notes`.

### Retrieve one note

`GET /api/notes/:id`

### Update a note

`PUT /api/notes/:id`

Send one or more fields to update, for example:

```json
{
  "title": "Updated meeting notes",
  "tags": ["planning", "follow-up"]
}
```

### Delete a note

`DELETE /api/notes/:id`

The API returns `404` when the note does not exist or does not belong to the authenticated user.

## Deployment on Render

1. Push the project to a GitHub repository.
2. In Render, create a **Blueprint** connected to the repository containing `render.yaml`.
3. When prompted, enter the following secret environment variables privately in Render:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET_KEY` — a strong, randomly generated secret
4. Apply the Blueprint and deploy the service. Render provides `PORT`; the app defaults to `3000` locally.
5. Verify the service by opening its root URL. The health response should say `Notes API is running`.

The Blueprint configures `JWT_EXPIRES=1d`, health checks at `/`, and the Node.js build and start commands. Never add database credentials or JWT secrets to `render.yaml`.

**Live API URL:** _Add the deployed Render URL here after deployment._

## Submission evidence

Add screenshots of successful search and pagination requests after testing the deployed API. Do not include credentials, bearer tokens, or secret environment-variable values in screenshots.
