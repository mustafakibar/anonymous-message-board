# FCC Information Security — Anonymous Message Board

Express + MongoDB anonymous message board with threads, replies, and hardened security headers, built for the FreeCodeCamp Information Security certification.

## Features

- `POST /api/threads/:board` — creates a new thread on a named board; password is bcrypt-hashed before storage
- `GET /api/threads/:board` — returns the 10 most-recently-bumped threads, each with up to 3 latest replies
- `PUT /api/threads/:board` — marks a thread as reported
- `DELETE /api/threads/:board` — deletes a thread after verifying its bcrypt password
- `POST /api/replies/:board` — adds a reply to a thread, bumping the thread's `bumped_on` timestamp
- `GET /api/replies/:board` — returns a full thread with all replies (query param `thread_id`)
- `PUT /api/replies/:board` — marks a reply as reported
- `DELETE /api/replies/:board` — soft-deletes a reply (sets text to `[deleted]`) after password check
- Helmet middleware sets `X-Frame-Options`, disables DNS prefetch, hides `X-Powered-By`, and enforces `same-origin` referrer policy
- Functional tests cover create, read, report, and delete paths for threads and replies

## Tech Stack

- Node.js
- Express
- MongoDB / Mongoose
- Helmet
- Chai / Mocha

## Requirements

- Node.js 16+
- MongoDB 4+
- Yarn 1.x or npm 8+

## Installation

```bash
yarn install
```

## Environment Variables

Derived from `.env`:

- `PORT` — server port (defaults to `3000`)
- `NODE_ENV` — `development` | `test` | `production`
- `DB` — MongoDB connection string

## Usage

```bash
yarn start
```

Server listens on `http://localhost:3000`.

## Testing

```bash
NODE_ENV=test yarn start
```

## API

- `GET /api/threads/:board` — list recent threads
- `POST /api/threads/:board` — create thread
- `PUT /api/threads/:board` — report thread
- `DELETE /api/threads/:board` — delete thread
- `GET /api/replies/:board` — get thread with replies
- `POST /api/replies/:board` — add reply
- `PUT /api/replies/:board` — report reply
- `DELETE /api/replies/:board` — delete reply

## Project Structure

```
.
├── routes/
├── tests/
├── public/
├── views/
├── db.js
├── server.js
└── package.json
```

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file.
