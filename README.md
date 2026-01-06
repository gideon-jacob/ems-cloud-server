# Node.js/Socket.IO Backend

## Setup
1. `cd backend`
2. `npm install`
3. `cp .env.example .env` and fill in Supabase credentials.

## Development
`npm run dev`

## Deployment
### AWS EC2
This repo includes a GitHub Action to deploy to EC2.
1. Add secrets to GitHub repo: `EC2_SSH_KEY`, `HOST_DNS`, `USERNAME`, `TARGET_DIR`.
2. Push to `main`.
3. The server uses PM2 for process management.

### Docker
`docker-compose up` (if using local database).
