# DEAD POETS SOCIETY

Local development:

```bash
npm install
npm start
```

This starts a simple Node server at `http://localhost:3000` that serves the static site and a file-backed API under `/api/*`.

Vercel production:

- For production you should replace the file-backed `api/*.js` handlers with real serverless functions that connect to a managed database (Postgres, MySQL, or MongoDB).
- Configure environment variables for database connection strings on Vercel dashboard.
- The frontend expects API endpoints at `/api/register`, `/api/login`, `/api/poems`, and `/api/users`.
