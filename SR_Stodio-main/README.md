# HASH Movies — Movie Discovery

HASH Movies is a responsive movie discovery website built with Astro and powered by The Movie Database (TMDB). It features trending and top-rated movies, live search, movie details, cast, related titles, official trailers, and U.S. streaming/rental/purchase availability when listed. Watch options link to TMDB; films are not streamed or hosted by this site. Provider data is attributed to JustWatch.

## Run locally

```bash
# Install app dependencies once
npm --prefix ./SR_Stodio-main install

# Start the local development server from the workspace root
npm run dev
```

The development server runs at `http://localhost:4321`.

## TMDB API key

The local `.env` file is ignored by Git. To set up another environment, copy `.env.example` to `.env` and set `TMDB_API_KEY` to your TMDB API key. Configure the same environment variable on your hosting provider. The key is used only by server-side Astro code; do not put it in client-side code or commit `.env`.

## Build and run

This project uses Astro's Netlify adapter for server-rendered pages and API routes. The root `netlify.toml` sets `SR_Stodio-main` as Netlify's base directory.

```bash
npm run build
npm run preview
```

For Netlify, set `TMDB_API_KEY` under **Site configuration → Environment variables**. The local `.env` file is not committed and is not available to Netlify.

The site displays TMDB API attribution in the footer.
