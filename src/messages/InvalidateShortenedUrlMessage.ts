import {
	AgentMessage,
	IsValidMessageType,
	parseMessageType,
} from "@aries-framework/core";
import { Expose } from "class-transformer";
import { IsString, IsUrl } from "class-validator";

interface InvalidateShortenedUrlMessageOptions {
	id?: string;
	shortenedUrl: string;
}

/**
 * Message to invalidate a shortened url
 */
export class InvalidateShortenedUrlMessage extends AgentMessage {
	public constructor(options: InvalidateShortenedUrlMessageOptions) {
		super();

		if (options) {
			this.id = options.id ?? this.generateId();
			this.shortenedUrl = options.shortenedUrl;
		}
	}

	@IsValidMessageType(InvalidateShortenedUrlMessage.type)
	public readonly type = InvalidateShortenedUrlMessage.type.messageTypeUri;
	public static readonly type = parseMessageType(
		"https://didcomm.org/shorten-url/1.0/invalidate-shortened-url",
	);

	@Expose({ name: "shortened_url" })
	@IsString()
	@IsUrl()
	public shortenedUrl!: string;
}
