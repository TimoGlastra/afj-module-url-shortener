/**
 * States for shorten-url protocol
 */
export enum ShortenUrlState {
	Null = "null",
	RequestReceived = "request-received",
	ShortenedUrlSent = "shortened-url-sent",
	InvalidateReceived = "invalidate-received",
	Invalidated = "invalidated",
	RequestSent = "request-sent",
	ShortenedUrlReceived = "shortened-url-received",
	InvalidateSent = "invalidate-sent",
}
