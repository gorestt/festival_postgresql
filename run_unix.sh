#!/usr/bin/env bash
set -e

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please review credentials if needed."
fi

npm install
npm run db:init
npm run db:seed
npm start
