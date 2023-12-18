import type { ShortenUrlRecord } from "./repository";

import { ShortenUrlState } from "./models";

export const SHORT_URL_SLUG_REGEX = /[A-Za-z0-9-_]*/;

export function isValidShortUrlSlug(shortUrlSlug: string) {
	return SHORT_URL_SLUG_REGEX.test(shortUrlSlug);
}

export function isInvalidShortUrl(shortenUrlRecord: ShortenUrlRecord) {
	const isStateInvalid =
		shortenUrlRecord.state !== ShortenUrlState.ShortenedUrlSent;

	return (
		isStateInvalid ||
		(shortenUrlRecord.expiresTime && shortenUrlRecord.expiresTime < Date.now())
	);
}

export function getProtocolScheme(url: string) {
	const [protocolScheme] = url.split(":");
	return protocolScheme;
}
