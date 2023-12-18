import type { ShortenUrlGoalCode } from "../models";

import {
	AgentMessage,
	IsValidMessageType,
	parseMessageType,
} from "@aries-framework/core";
import { Expose } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

interface RequestShortenedUrlMessageOptions {
	id?: string;
	url: string;
	requestedValiditySeconds: number;
	goalCode: ShortenUrlGoalCode;
	shortUrlSlug?: string;
}

/**
 * Message to request a shortened url
 */
export class RequestShortenedUrlMessage extends AgentMessage {
	public constructor(options: RequestShortenedUrlMessageOptions) {
		super();

		if (options) {
			this.id = options.id ?? this.generateId();
			this.url = options.url;
			this.requestedValiditySeconds = options.requestedValiditySeconds;
			this.goalCode = options.goalCode;
			this.shortUrlSlug = options.shortUrlSlug;
		}
	}

	@IsValidMessageType(RequestShortenedUrlMessage.type)
	public readonly type = RequestShortenedUrlMessage.type.messageTypeUri;
	public static readonly type = parseMessageType(
		"https://didcomm.org/shorten-url/1.0/request-shortened-url",
	);

	@IsString()
	public url!: string;

	@Expose({ name: "requested_validity_seconds" })
	@IsNumber()
	public requestedValiditySeconds!: number;

	@Expose({ name: "goal_code" })
	@IsString()
	public goalCode!: string;

	@Expose({ name: "short_url_slug" })
	@IsString()
	@IsOptional()
	public shortUrlSlug?: string;
}
