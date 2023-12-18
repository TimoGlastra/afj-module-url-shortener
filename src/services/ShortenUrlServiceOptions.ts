import type { ConnectionRecord } from "@aries-framework/core";
import type { ShortenUrlGoalCode } from "../models";
import type { ShortenUrlRecord } from "../repository";

export interface CreateRequestShortenedUrlOptions {
	connectionRecord: ConnectionRecord;
	url: string;
	requestedValiditySeconds: number;
	goalCode: ShortenUrlGoalCode;
	shortUrlSlug?: string;
}

export interface CreateShortenedUrlMessageOptions {
	shortenUrlRecord: ShortenUrlRecord;
	shortenedUrl: string;
	expiresTime?: number;
}

export interface createInvalidateShortenedUrlMessage {
	shortenUrlRecord: ShortenUrlRecord;
}
