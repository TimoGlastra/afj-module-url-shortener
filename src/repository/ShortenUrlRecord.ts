import type { TagsBase } from "@aries-framework/core";
import type {
	ShortenUrlGoalCode,
	ShortenUrlRole,
	ShortenUrlState,
} from "../models";

import { AriesFrameworkError, BaseRecord, utils } from "@aries-framework/core";

export interface ShortenUrlRecordProps {
	id?: string;
	createdAt?: Date;
	state: ShortenUrlState;
	role: ShortenUrlRole;
	connectionId: string;
	threadId: string;

	tags?: CustomShortenUrlTags;

	shortenedUrl?: string;
	originalUrl: string;
	expiresTime?: number;
	shortUrlSlug?: string;
	shortenStrategy: ShortenUrlGoalCode;
}

export type CustomShortenUrlTags = TagsBase;
export type DefaultShortenUrlTags = {
	threadId: string;
	connectionId: string;
	state: ShortenUrlState;
	role: ShortenUrlRole;
	shortenedUrl?: string;
	shortUrlSlug?: string;
	originalUrl: string;
};

export class ShortenUrlRecord extends BaseRecord<
	DefaultShortenUrlTags,
	CustomShortenUrlTags
> {
	public connectionId!: string;
	public threadId!: string;
	public state!: ShortenUrlState;
	public role!: ShortenUrlRole;
	public shortenedUrl?: string;
	public originalUrl!: string;
	public expiresTime?: number;
	public shortUrlSlug?: string;
	public shortenStrategy!: ShortenUrlGoalCode;

	public static readonly type = "ShortenUrlRecord";
	public readonly type = ShortenUrlRecord.type;

	public constructor(props: ShortenUrlRecordProps) {
		super();
		if (props) {
			this.id = props.id ?? utils.uuid();
			this.createdAt = props.createdAt ?? new Date();
			this.state = props.state;
			this.role = props.role;
			this.connectionId = props.connectionId;
			this.threadId = props.threadId;
			this._tags = props.tags ?? {};

			this.shortenedUrl = props.shortenedUrl;
			this.expiresTime = props.expiresTime;
			this.shortUrlSlug = props.shortUrlSlug;
			this.shortenStrategy = props.shortenStrategy;
			this.originalUrl = props.originalUrl;
		}
	}

	public getTags() {
		return {
			...this._tags,
			threadId: this.threadId,
			connectionId: this.connectionId,
			state: this.state,
			role: this.role,
			shortenedUrl: this.shortenedUrl,
			originalUrl: this.originalUrl,
			shortUrlSlug: this.shortUrlSlug,
		};
	}

	public assertState(expectedStates: ShortenUrlState | ShortenUrlState[]) {
		const expected = Array.isArray(expectedStates)
			? expectedStates
			: [expectedStates];
		if (!expected.includes(this.state)) {
			throw new AriesFrameworkError(
				`Shorten URL record is in invalid state ${
					this.state
				}. Valid states are: ${expected.join(", ")}.`,
			);
		}
	}

	public assertRole(expectedRole: ShortenUrlRole) {
		if (this.role !== expectedRole) {
			throw new AriesFrameworkError(
				`Shorten URL record has invalid role ${this.role}. Expected role ${expectedRole}.`,
			);
		}
	}
}
