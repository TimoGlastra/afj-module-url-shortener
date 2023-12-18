import {
	AgentMessage,
	IsValidMessageType,
	parseMessageType,
} from "@aries-framework/core";
import { Expose } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUrl } from "class-validator";

interface ShortenedUrlMessageOptions {
	id?: string;
	shortenedUrl: string;
	expiresTime?: number;
	threadId: string;
}

/**
 * Message to  a shortened url
 */
export class ShortenedUrlMessage extends AgentMessage {
	public constructor(options: ShortenedUrlMessageOptions) {
		super();

		if (options) {
			this.id = options.id ?? this.generateId();
			this.shortenedUrl = options.shortenedUrl;
			this.expiresTime = options.expiresTime;
			this.setThread({
				threadId: options.threadId,
			});
		}
	}

	@IsValidMessageType(ShortenedUrlMessage.type)
	public readonly type = ShortenedUrlMessage.type.messageTypeUri;
	public static readonly type = parseMessageType(
		"https://didcomm.org/shorten-url/1.0/shortened-url",
	);

	@Expose({ name: "shortened_url" })
	@IsString()
	@IsUrl()
	public shortenedUrl!: string;

	@Expose({ name: "expires_time" })
	@IsNumber()
	@IsOptional()
	public expiresTime?: number;
}
