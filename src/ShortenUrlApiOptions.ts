import type { ShortenUrlGoalCode, ShortenUrlProblemCode } from "./models";

export interface RequestShortenedUrlOptions {
	connectionId: string;
	url: string;
	requestedValiditySeconds: number;
	goalCode: ShortenUrlGoalCode;
	shortUrlSlug?: string;
}

export interface AcceptShortenedUrlRequestOptions {
	shortenUrlId: string;

	/**
	 * Optionally provide the shortened url to share with the requester. If not provided, the shortened url will be created
	 * using the `ShortenUrlApi.createShortenedUrl`. You need to make sure your agent is set up correctly with the express
	 * handler for http(s), or a custom handler. If passed, no validation is done on the shortenedUrl.
	 */
	shortenedUrl?: string;
}

export interface InvalidateShortenedUrlOptions {
	shortenUrlId: string;
}

export interface CreateShortenedUrlOptions {
	shortenStrategy: ShortenUrlGoalCode;
	shortUrlSlug?: string;
	originalUrl: string;

	/**
	 * The base url of the shortened url. This is the url that will be used to redirect to the original url.
	 * If not provided, the httpBaseUrl from the ShortenUrlModuleConfig will be used.
	 */
	httpBaseUrl?: string;
}

export interface DeclineShortenedUrlRequest {
	shortenUrlId: string;

	// Problem codes for shorten url request
	problemCode:
		| ShortenUrlProblemCode.ValidityTooLong
		| ShortenUrlProblemCode.InvalidUrl
		| ShortenUrlProblemCode.InvalidProtocolScheme
		| ShortenUrlProblemCode.InvalidGoalCode
		| ShortenUrlProblemCode.SlugsNotSupported
		| ShortenUrlProblemCode.InvalidSlug;
	description: string;
}
