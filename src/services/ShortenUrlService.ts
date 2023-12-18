import type {
	AgentContext,
	InboundMessageContext,
} from "@aries-framework/core";
import type { ShortenUrlStateChangedEvent } from "../models/ShortenUrlEvents";
import type {
	CreateRequestShortenedUrlOptions,
	CreateShortenedUrlMessageOptions,
	createInvalidateShortenedUrlMessage,
} from "./ShortenUrlServiceOptions";

import {
	AriesFrameworkError,
	EventEmitter,
	InjectionSymbols,
	JsonTransformer,
	Logger,
	inject,
	injectable,
	utils,
} from "@aries-framework/core";
import { ProblemReportError } from "@aries-framework/core/build/modules/problem-reports";
import {
	DidCommMessageRepository,
	DidCommMessageRole,
} from "@aries-framework/core/build/storage";
import { isEnum, isURL } from "class-validator";

import {
	InvalidateShortenedUrlMessage,
	RequestShortenedUrlMessage,
	ShortenedUrlMessage,
} from "../messages";
import {
	ShortenUrlEventTypes,
	ShortenUrlGoalCode,
	ShortenUrlProblemCode,
	ShortenUrlRole,
	ShortenUrlState,
} from "../models";
import { ShortenUrlRecord, ShortenUrlRepository } from "../repository";
import {
	SHORT_URL_SLUG_REGEX,
	isInvalidShortUrl,
	isValidShortUrlSlug,
} from "../shortUrlUtils";

@injectable()
export class ShortenUrlService {
	private shortenUrlRepository: ShortenUrlRepository;
	private eventEmitter: EventEmitter;
	private didCommMessageRepository: DidCommMessageRepository;

	public constructor(
		shortenUrlRepository: ShortenUrlRepository,
		eventEmitter: EventEmitter,
		didCommMessageRepository: DidCommMessageRepository,
		@inject(InjectionSymbols.Logger) logger: Logger,
	) {
		this.shortenUrlRepository = shortenUrlRepository;
		this.eventEmitter = eventEmitter;
		this.didCommMessageRepository = didCommMessageRepository;
	}

	public async createRequestShortenedUrlMessage(
		agentContext: AgentContext,
		options: CreateRequestShortenedUrlOptions,
	) {
		agentContext.config.logger.debug(
			`Creating ${RequestShortenedUrlMessage.type.messageTypeUri} message`,
		);

		const message = new RequestShortenedUrlMessage({
			url: options.url,
			goalCode: options.goalCode,
			requestedValiditySeconds: options.requestedValiditySeconds,
			shortUrlSlug: options.shortUrlSlug,
		});

		const shortenUrlRecord = new ShortenUrlRecord({
			connectionId: options.connectionRecord.id,
			state: ShortenUrlState.RequestSent,
			threadId: message.threadId,
			role: ShortenUrlRole.LongUrlProvider,
			shortenStrategy: options.goalCode,
			originalUrl: options.url,
		});

		await this.shortenUrlRepository.save(agentContext, shortenUrlRecord);
		this.emitStateChangedEvent(agentContext, shortenUrlRecord, null);

		agentContext.config.logger.debug(
			`Finished creating ${RequestShortenedUrlMessage.type.messageTypeUri} message and stored record`,
		);
		return { message, shortenUrlRecord };
	}

	public async processRequestShortenedUrlMessage(
		messageContext: InboundMessageContext<RequestShortenedUrlMessage>,
	) {
		messageContext.agentContext.config.logger.debug(
			`Processing ${RequestShortenedUrlMessage.type.messageTypeUri} message`,
		);

		const connectionRecord = messageContext.assertReadyConnection();

		const message = messageContext.message;

		if (!isURL(message.url)) {
			throw new ProblemReportError(`url ${message.url} is not a valid URL`, {
				problemCode: ShortenUrlProblemCode.InvalidUrl,
			});
		}

		if (!isEnum(message.goalCode, ShortenUrlGoalCode)) {
			throw new ProblemReportError(
				`goal_code ${message.goalCode} is not a valid goal code.`,
				{
					problemCode: ShortenUrlProblemCode.InvalidGoalCode,
				},
			);
		}

		// If shorten strategy is oob v1, the original url MUST include the oob= property
		if (
			message.goalCode === ShortenUrlGoalCode.ShortenOobV1 &&
			!message.url.includes("oob=")
		) {
			throw new ProblemReportError(
				`url ${message.url} MUST contain oob= property if goal_code is ${ShortenUrlGoalCode.ShortenOobV1}.`,
				{
					problemCode: ShortenUrlProblemCode.InvalidUrl,
				},
			);
		}

		// If shorten strategy is oob v2, the original url MUST include the _oob= property
		if (
			message.goalCode === ShortenUrlGoalCode.ShortenOobV2 &&
			!message.url.includes("_oob=")
		) {
			throw new ProblemReportError(
				`url ${message.url} MUST contain _oob= property if goal_code is ${ShortenUrlGoalCode.ShortenOobV2}.`,
				{
					problemCode: ShortenUrlProblemCode.InvalidUrl,
				},
			);
		}

		if (message.shortUrlSlug && !isValidShortUrlSlug(message.shortUrlSlug)) {
			throw new ProblemReportError(
				`short_url_slug ${
					message.shortUrlSlug
				} is not a valid short url. Must match pattern '${SHORT_URL_SLUG_REGEX.toString()}'.`,
				{
					problemCode: ShortenUrlProblemCode.InvalidGoalCode,
				},
			);
		}

		let shortUrlSlug = message.shortUrlSlug;

		// Generate slug if not using oob v2 shorten strategy (as that uses _oobid)
		if (!shortUrlSlug && message.goalCode !== ShortenUrlGoalCode.ShortenOobV2) {
			shortUrlSlug = utils.uuid();
		}

		const record = new ShortenUrlRecord({
			connectionId: connectionRecord.id,
			state: ShortenUrlState.RequestReceived,
			threadId: messageContext.message.threadId,
			role: ShortenUrlRole.UrlShortener,
			shortenStrategy: messageContext.message.goalCode as ShortenUrlGoalCode,
			originalUrl: messageContext.message.url,
			shortUrlSlug,
		});

		await this.didCommMessageRepository.saveAgentMessage(
			messageContext.agentContext,
			{
				agentMessage: messageContext.message,
				associatedRecordId: record.id,
				role: DidCommMessageRole.Receiver,
			},
		);

		await this.shortenUrlRepository.save(messageContext.agentContext, record);
		this.emitStateChangedEvent(messageContext.agentContext, record, null);

		messageContext.agentContext.config.logger.debug(
			`Finished processing ${RequestShortenedUrlMessage.type.messageTypeUri} message`,
		);
	}

	public async createShortenedUrlMessage(
		agentContext: AgentContext,
		{ shortenUrlRecord, ...options }: CreateShortenedUrlMessageOptions,
	) {
		agentContext.config.logger.debug(
			`Creating ${ShortenedUrlMessage.type.messageTypeUri} message`,
		);

		shortenUrlRecord.assertRole(ShortenUrlRole.UrlShortener);
		shortenUrlRecord.assertState(ShortenUrlState.RequestReceived);

		const message = new ShortenedUrlMessage({
			threadId: shortenUrlRecord.threadId,
			shortenedUrl: options.shortenedUrl,
			expiresTime: options.expiresTime,
		});

		shortenUrlRecord.shortenedUrl = options.shortenedUrl;
		shortenUrlRecord.expiresTime = options.expiresTime;

		await this.updateState(
			agentContext,
			shortenUrlRecord,
			ShortenUrlState.ShortenedUrlSent,
		);

		agentContext.config.logger.debug(
			`Finished creating ${ShortenedUrlMessage.type.messageTypeUri} and updated record`,
		);
		return { message, shortenUrlRecord };
	}

	public async processShortenedUrlMessage(
		messageContext: InboundMessageContext<ShortenedUrlMessage>,
	) {
		messageContext.agentContext.config.logger.debug(
			`Processing ${ShortenedUrlMessage.type.messageTypeUri} message`,
		);

		const connectionRecord = messageContext.assertReadyConnection();

		// Find shorten url record, send problem report if not found for current context
		const shortenUrlRecord =
			await this.shortenUrlRepository.findByConnectionAndThreadId(
				messageContext.agentContext,
				connectionRecord.id,
				messageContext.message.threadId,
			);

		if (
			!shortenUrlRecord ||
			shortenUrlRecord.state !== ShortenUrlState.RequestSent ||
			shortenUrlRecord.role !== ShortenUrlRole.LongUrlProvider
		) {
			throw new ProblemReportError(
				"Invalid invocation of the shortened-url message",
				{
					problemCode: "invalid-state",
				},
			);
		}

		shortenUrlRecord.shortenedUrl = messageContext.message.shortenedUrl;
		shortenUrlRecord.expiresTime = messageContext.message.expiresTime;

		await this.updateState(
			messageContext.agentContext,
			shortenUrlRecord,
			ShortenUrlState.ShortenedUrlReceived,
		);

		messageContext.agentContext.config.logger.debug(
			`Finished processing ${ShortenedUrlMessage.type.messageTypeUri}`,
		);

		return shortenUrlRecord;
	}

	public async createInvalidateShortenedUrlMessage(
		agentContext: AgentContext,
		{ shortenUrlRecord }: createInvalidateShortenedUrlMessage,
	) {
		agentContext.config.logger.debug(
			`Creating ${InvalidateShortenedUrlMessage.type.messageTypeUri} message`,
		);

		shortenUrlRecord.assertRole(ShortenUrlRole.LongUrlProvider);
		shortenUrlRecord.assertState(ShortenUrlState.ShortenedUrlReceived);

		if (!shortenUrlRecord.shortenedUrl) {
			throw new AriesFrameworkError(
				"Can't create invalidate message without shortened url in record",
			);
		}

		const message = new InvalidateShortenedUrlMessage({
			shortenedUrl: shortenUrlRecord.shortenedUrl,
		});

		await this.updateState(
			agentContext,
			shortenUrlRecord,
			ShortenUrlState.InvalidateSent,
		);

		agentContext.config.logger.debug(
			`Finished creating ${InvalidateShortenedUrlMessage.type.messageTypeUri} and updated record`,
		);

		return { message, shortenUrlRecord };
	}

	public async processInvalidateShortenedUrlMessage(
		messageContext: InboundMessageContext<InvalidateShortenedUrlMessage>,
	) {
		messageContext.agentContext.config.logger.debug(
			`Processing ${InvalidateShortenedUrlMessage.type.messageTypeUri} message`,
		);

		const connectionRecord = messageContext.assertReadyConnection();

		// Find shorten url record, send problem report if not found for current context
		const shortenUrlRecord = await this.shortenUrlRepository.findByShortenedUrl(
			messageContext.agentContext,
			messageContext.message.shortenedUrl,
		);

		if (!shortenUrlRecord || isInvalidShortUrl(shortenUrlRecord)) {
			throw new ProblemReportError("Can't invalidate shortened url", {
				problemCode: ShortenUrlProblemCode.ShortUrlInvalid,
			});
		}

		if (shortenUrlRecord.connectionId !== connectionRecord.id) {
			throw new ProblemReportError("Can't invalidate shortened url", {
				problemCode: ShortenUrlProblemCode.RejectedInvalidation,
			});
		}

		await this.updateState(
			messageContext.agentContext,
			shortenUrlRecord,
			ShortenUrlState.InvalidateReceived,
		);

		messageContext.agentContext.config.logger.debug(
			`Finished processing ${InvalidateShortenedUrlMessage.type.messageTypeUri}`,
		);

		return shortenUrlRecord;
	}

	public async getRequestShortenUrlMessage(
		agentContext: AgentContext,
		shortenUrlRecordId: string,
	) {
		return this.didCommMessageRepository.getAgentMessage(agentContext, {
			associatedRecordId: shortenUrlRecordId,
			messageClass: RequestShortenedUrlMessage,
		});
	}

	public async getById(agentContext: AgentContext, shortenUrlId: string) {
		return this.shortenUrlRepository.getById(agentContext, shortenUrlId);
	}

	public async getAll(agentContext: AgentContext) {
		return this.shortenUrlRepository.getAll(agentContext);
	}

	public async deleteById(agentContext: AgentContext, shortenUrlId: string) {
		return this.shortenUrlRepository.deleteById(agentContext, shortenUrlId);
	}

	public async findByShortUrlSlug(
		agentContext: AgentContext,
		shortUrlSlug: string,
	) {
		return this.shortenUrlRepository.findByShortUrlSlug(
			agentContext,
			shortUrlSlug,
		);
	}

	public async findByShortenedUrl(
		agentContext: AgentContext,
		shortUrlSlug: string,
	) {
		return this.shortenUrlRepository.findByShortenedUrl(
			agentContext,
			shortUrlSlug,
		);
	}

	public async updateState(
		agentContext: AgentContext,
		shortenUrlRecord: ShortenUrlRecord,
		state: ShortenUrlState,
	) {
		const previousState = shortenUrlRecord.state;
		shortenUrlRecord.state = state;

		await this.shortenUrlRepository.update(agentContext, shortenUrlRecord);
		this.emitStateChangedEvent(agentContext, shortenUrlRecord, previousState);
	}

	private emitStateChangedEvent(
		agentContext: AgentContext,
		shortenUrlRecord: ShortenUrlRecord,
		previousState: ShortenUrlState | null,
	) {
		const clonedRecord = JsonTransformer.clone(shortenUrlRecord);

		this.eventEmitter.emit<ShortenUrlStateChangedEvent>(agentContext, {
			type: ShortenUrlEventTypes.ShortenUrlStateChanged,
			payload: {
				shortenUrlRecord: clonedRecord,
				previousState: previousState,
			},
		});
	}
}
