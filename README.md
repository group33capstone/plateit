# Authors

<Luis Ibarra, Joshua Akeredolu, Dongyoung Yang>

# Group33 Captstone Project

This repository is a fullstack webapp with Vite + React client talking to a local Node/Express proxy which forwards requests to Google's Generative Language (Gemini) APIs.

<img src='walkthrough.gif' title='Video Walkthrough' width='' alt='Video Walkthrough' />

## Prerequisites

- A Google Generative Language API key (from Google AI Studio / Cloud Console)

## Project layout

- `client/` — Vite + React frontend (dev port: 5173)
- `server/` — local Express proxy that forwards requests to Google (listens on port 3001 by default)

## Environment variables

Create a `.env` file in the `server/` folder (do NOT commit it). You can copy the example below and fill in your API key.

server/.env

GOOGLE_API_KEY="your_real_google_api_key_here"
