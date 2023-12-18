import {
	AgentContext,
	EventEmitter,
	InjectionSymbols,
	Repository,
	StorageService,
	inject,
	injectable,
} from "@aries-framework/core";

import { ShortenUrlRecord } from "./ShortenUrlRecord";

@injectable()
export class ShortenUrlRepository extends Repository<ShortenUrlRecord> {
	public constructor(
		@inject(InjectionSymbols.StorageService)
		storageService: StorageService<ShortenUrlRecord>,
		eventEmitter: EventEmitter,
	) {
		super(ShortenUrlRecord, storageService, eventEmitter);
	}

	public async findByConnectionAndThreadId(
		agentContext: AgentContext,
		connectionId: string,
		threadId: string,
	) {
		return this.findSingleByQuery(agentContext, {
			connectionId,
			threadId,
		});
	}

	public async findByShortenedUrl(
		agentContext: AgentContext,
		shortenedUrl: string,
	) {
		return this.findSingleByQuery(agentContext, {
			shortenedUrl,
		});
	}

	public async findByShortUrlSlug(
		agentContext: AgentContext,
		shortUrlSlug: string,
	) {
		return this.findSingleByQuery(agentContext, {
			shortUrlSlug,
		});
	}
}
