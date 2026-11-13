import type { APIRoute } from 'astro';
import { searchMovies, TmdbError } from '../../lib/tmdb';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (query.length < 2) {
		return Response.json({ movies: [] });
	}
	if (query.length > 100) {
		return Response.json({ error: 'Search query is too long.' }, { status: 400 });
	}

	try {
		return Response.json({ movies: await searchMovies(query) });
	} catch (error) {
		if (error instanceof TmdbError) {
			console.error('TMDB search failed:', error.message);
			return Response.json({ error: error.message }, { status: 502 });
		}
		throw error;
	}
};
