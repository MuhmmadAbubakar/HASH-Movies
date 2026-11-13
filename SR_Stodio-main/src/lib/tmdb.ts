import { env } from 'node:process';

const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface Movie {
	id: number;
	title: string;
	year: string;
	rating: string;
	category: string;
	description: string;
	imageUrl: string;
	backdropUrl: string;
}

interface TmdbMovie {
	id: number;
	title: string;
	release_date?: string;
	vote_average?: number;
	overview?: string;
	poster_path?: string | null;
	backdrop_path?: string | null;
	genre_ids?: number[];
	genres?: Array<{ id: number; name: string }>;
	runtime?: number | null;
	credits?: {
		cast?: Array<{ id: number; name: string; character: string }>;
	};
	videos?: {
		results?: Array<{
			key: string;
			site: string;
			type: string;
			official: boolean;
		}>;
	};
	similar?: { results?: TmdbMovie[] };
}

interface TmdbList {
	results: TmdbMovie[];
}

interface TmdbProvider {
	provider_id: number;
	provider_name: string;
	logo_path: string | null;
}

interface TmdbProviderRegion {
	link: string;
	flatrate?: TmdbProvider[];
	free?: TmdbProvider[];
	ads?: TmdbProvider[];
	rent?: TmdbProvider[];
	buy?: TmdbProvider[];
}

interface TmdbWatchProviders {
	results: Record<string, TmdbProviderRegion>;
}

const genresById: Record<number, string> = {
	28: 'Action',
	12: 'Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	14: 'Fantasy',
	36: 'History',
	27: 'Horror',
	10402: 'Music',
	9648: 'Mystery',
	10749: 'Romance',
	878: 'Science Fiction',
	10770: 'TV Movie',
	53: 'Thriller',
	10752: 'War',
	37: 'Western',
};

export class TmdbError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(message);
		this.name = 'TmdbError';
	}
}

function imageUrl(path: string | null | undefined, size: 'w500' | 'original'): string {
	return path ? `${IMAGE_BASE_URL}/${size}${path}` : '';
}

function toMovie(movie: TmdbMovie): Movie {
	const category = movie.genres?.[0]?.name
		?? movie.genre_ids?.map((id) => genresById[id]).find(Boolean)
		?? 'Movie';

	return {
		id: movie.id,
		title: movie.title,
		year: movie.release_date?.slice(0, 4) ?? '—',
		rating: typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : '—',
		category,
		description: movie.overview ?? '',
		imageUrl: imageUrl(movie.poster_path, 'w500'),
		backdropUrl: imageUrl(movie.backdrop_path, 'original'),
	};
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
	const apiKey = env.TMDB_API_KEY;
	if (!apiKey) {
		throw new TmdbError('TMDB_API_KEY is not configured. Add it to the project .env file.');
	}

	const url = new URL(`${API_BASE_URL}${path}`);
	url.searchParams.set('api_key', apiKey);
	url.searchParams.set('language', 'en-US');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}

	let response: Response;
	try {
		response = await fetch(url);
	} catch {
		throw new TmdbError('Could not connect to TMDB. Please try again later.');
	}

	if (!response.ok) {
		throw new TmdbError(
			response.status === 404 ? 'Movie not found.' : `TMDB request failed (${response.status}).`,
			response.status,
		);
	}

	return await response.json() as T;
}

export async function getTrendingMovies(): Promise<Movie[]> {
	const data = await request<TmdbList>('/trending/movie/week');
	return data.results.map(toMovie);
}

export async function getTopRatedMovies(): Promise<Movie[]> {
	const data = await request<TmdbList>('/movie/top_rated', { page: '1' });
	return data.results.map(toMovie);
}

export async function searchMovies(query: string): Promise<Movie[]> {
	const data = await request<TmdbList>('/search/movie', {
		query,
		include_adult: 'false',
		page: '1',
	});
	return data.results.slice(0, 8).map(toMovie);
}

export async function getMovieDetails(id: number) {
	const [movie, watchData] = await Promise.all([
		request<TmdbMovie>(`/movie/${id}`, {
			append_to_response: 'credits,videos,similar',
		}),
		request<TmdbWatchProviders>(`/movie/${id}/watch/providers`),
	]);
	const details = toMovie(movie);
	const trailer = movie.videos?.results?.find(
		(video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official,
	) ?? movie.videos?.results?.find(
		(video) => video.site === 'YouTube' && video.type === 'Trailer',
	);
	const usProviders = watchData.results.US;
	const providerCategories = [
		{ label: 'Subscription', providers: usProviders?.flatrate ?? [] },
		{ label: 'Free', providers: usProviders?.free ?? [] },
		{ label: 'With ads', providers: usProviders?.ads ?? [] },
		{ label: 'Rent', providers: usProviders?.rent ?? [] },
		{ label: 'Buy', providers: usProviders?.buy ?? [] },
	];

	return {
		...details,
		runtime: movie.runtime ?? null,
		cast: movie.credits?.cast?.slice(0, 6) ?? [],
		trailerUrl: trailer ? `https://www.youtube-nocookie.com/embed/${trailer.key}` : '',
		similarMovies: movie.similar?.results?.slice(0, 6).map(toMovie) ?? [],
		watchLink: usProviders?.link ?? '',
		watchOffers: providerCategories
			.filter((category) => category.providers.length > 0)
			.map((category) => ({
				label: category.label,
				providers: category.providers.map((provider) => ({
					id: provider.provider_id,
					name: provider.provider_name,
					logoUrl: provider.logo_path ? `${IMAGE_BASE_URL}/w92${provider.logo_path}` : '',
				})),
			})),
	};
}
