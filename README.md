# scriptorium

A simple Progressive Web App text editor for authors.

## Setup

Install dependencies:

```bash
bun install
```

Generate a local self-signed TLS certificate (required for HTTPS):

```bash
mkdir certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

## Run

```bash
bun run start
```

Open [https://localhost:3000](https://localhost:3000). The browser will warn about the self-signed certificate — that is expected for local HTTPS.

Override the port with `PORT` if needed:

```bash
PORT=8443 bun run start
```

Static files are served from the project root (for GitHub Pages).

This project was created using `bun init` in bun v1.3.12. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
