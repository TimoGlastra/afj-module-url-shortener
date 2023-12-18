import type {
	AcceptShortenedUrlRequestOptions,
	CreateShortenedUrlOptions,
	DeclineShortenedUrlRequest,
	InvalidateShortenedUrlOptions,
	RequestShortenedUrlOptions,
} from "./ShortenUrlApiOptions";

import {
	AgentContext,
	AriesFrameworkError,
	ConnectionService,
	MessageSender,
	getOutboundMessageContext,
	injectable,
	utils,
} from "@aries-framework/core";
import { ProblemReportMessage } from "@aries-framework/core/build/modules/problem-reports";

import { ShortenUrlModuleConfig } from "./ShortenUrlModuleConfig";
import { ShortenUrlGoalCode, ShortenUrlRole, ShortenUrlState } from "./models";
import { ShortenUrlService } from "./services";
import { getProtocolScheme } from "./shortUrlUtils";

@injectable()
export class ShortenUrlApi {
	public constructor(
		private agentContext: AgentContext,
		private shortenUrlService: ShortenUrlService,
		private connectionService: ConnectionService,
		private messageSender: MessageSender,
		public readonly config: ShortenUrlModuleConfig,
	) {}

	public async requestShortenedUrl(options: RequestShortenedUrlOptions) {
		const connectionRecord = await this.connectionService.getById(
			this.agentContext,
			options.connectionId,
		);

		const { message, shortenUrlRecord } =
			await this.shortenUrlService.createRequestShortenedUrlMessage(
				this.agentContext,
				{
					connectionRecord,
					goalCode: options.goalCode,
					requestedValiditySeconds: options.requestedValiditySeconds,
					url: options.url,
					shortUrlSlug: options.shortUrlSlug,
				},
			);

		const outboundMessage = await getOutboundMessageContext(this.agentContext, {
			connectionRecord,
			message,
		});
		await this.messageSender.sendMessage(outboundMessage);

		return shortenUrlRecord;
	}

	/**
	 * Generate a shortened url for the given strategy, slug and baseUrl. This does not do any checks
	 * on whether the long url is valid, and can actually be hosted as a shortened url.
	 */
	public createShortenedUrl({
		shortenStrategy,
		shortUrlSlug,
		originalUrl,
		httpBaseUrl,
	}: CreateShortenedUrlOptions) {
		const protocolScheme = getProtocolScheme(originalUrl);

		// Only allow http and https for the internal method to create shortened urls.
		if (!["http", "https"].includes(protocolScheme)) {
			throw new AriesFrameworkError(
				"Only 'http' and 'https' are supported to create shortened urls. If using other methods, you can create the shortened url yourself and provide that to the acceptShortenedUrlRequest method.",
			);
		}

		const shortUrlBase = httpBaseUrl ?? this.config.httpBaseUrl;
		if (!shortUrlBase) {
			throw new AriesFrameworkError(
				"No httpBaseUrl was provided, and no httpBaseUrl was configured in the ShortenUrlModuleConfig.",
			);
		}

		if (shortenStrategy === ShortenUrlGoalCode.Shorten) {
			const slug = shortUrlSlug ?? utils.uuid();
			return `${shortUrlBase}/${slug}`;
		}
		if (shortenStrategy === ShortenUrlGoalCode.ShortenOobV1) {
			const slug = shortUrlSlug ?? utils.uuid();
			return `${shortUrlBase}/${slug}`;
		}
		if (shortenStrategy === ShortenUrlGoalCode.ShortenOobV2) {
			if (shortUrlSlug) {
				return `${shortUrlBase}/${shortUrlSlug}?_oobid=${utils.uuid()}`;
			}
			return `${shortUrlBase}?_oobid=${utils.uuid()}`;
		}

		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw new AriesFrameworkError(
			`Unsupported shorten strategy: ${shortenStrategy}`,
		);
	}

	public async declineShortenedUrlRequest(options: DeclineShortenedUrlRequest) {
		const record = await this.shortenUrlService.getById(
			this.agentContext,
			options.shortenUrlId,
		);
		const connectionRecord = await this.connectionService.getById(
			this.agentContext,
			record.connectionId,
		);

		record.assertRole(ShortenUrlRole.UrlShortener);
		record.assertState(ShortenUrlState.RequestReceived);

		const problemReport = new ProblemReportMessage({
			description: {
				code: options.problemCode,
				en: options.description,
			},
		});

		const outboundMessage = await getOutboundMessageContext(this.agentContext, {
			connectionRecord,
			message: problemReport,
		});
		await this.messageSender.sendMessage(outboundMessage);

		return outboundMessage;
	}

	public async acceptShortenedUrlRequest(
		options: AcceptShortenedUrlRequestOptions,
	) {
		const record = await this.shortenUrlService.getById(
			this.agentContext,
			options.shortenUrlId,
		);
		const connectionRecord = await this.connectionService.getById(
			this.agentContext,
			record.connectionId,
		);

		const requestMessage =
			await this.shortenUrlService.getRequestShortenUrlMessage(
				this.agentContext,
				record.id,
			);

		// Calculate the expires time if requested validity seconds is set and not 0
		const expiresTime =
			requestMessage.requestedValiditySeconds &&
			requestMessage.requestedValiditySeconds !== 0
				? Date.now() + requestMessage.requestedValiditySeconds * 1000
				: undefined;

		// Use provided short url, or generate one if not provided
		const shortenedUrl =
			options.shortenedUrl ??
			this.createShortenedUrl({
				originalUrl: record.originalUrl,
				shortenStrategy: record.shortenStrategy,
				shortUrlSlug: record.shortUrlSlug,
			});

		const { message, shortenUrlRecord } =
			await this.shortenUrlService.createShortenedUrlMessage(
				this.agentContext,
				{
					shortenUrlRecord: record,
					shortenedUrl,
					expiresTime,
				},
			);

		const outboundMessage = await getOutboundMessageContext(this.agentContext, {
			connectionRecord,
			message,
		});
		await this.messageSender.sendMessage(outboundMessage);
		return shortenUrlRecord;
	}

	public async requestShortenedUrlInvalidation(
		options: InvalidateShortenedUrlOptions,
	) {
		const record = await this.shortenUrlService.getById(
			this.agentContext,
			options.shortenUrlId,
		);
		const connectionRecord = await this.connectionService.getById(
			this.agentContext,
			record.connectionId,
		);

		const { message, shortenUrlRecord } =
			await this.shortenUrlService.createInvalidateShortenedUrlMessage(
				this.agentContext,
				{
					shortenUrlRecord: record,
				},
			);

		const outboundMessage = await getOutboundMessageContext(this.agentContext, {
			connectionRecord,
			message,
		});
		await this.messageSender.sendMessage(outboundMessage);

		return shortenUrlRecord;
	}

	public async getById(shortenUrlId: string) {
		return this.shortenUrlService.getById(this.agentContext, shortenUrlId);
	}

	public async getAll() {
		return this.shortenUrlService.getAll(this.agentContext);
	}

	public async deleteById(shortenUrlId: string) {
		return this.shortenUrlService.deleteById(this.agentContext, shortenUrlId);
	}

	public async findByShortUrlSlug(shortUrlSlug: string) {
		return this.shortenUrlService.findByShortUrlSlug(
			this.agentContext,
			shortUrlSlug,
		);
	}

	public async findByShortenedUrl(shortenedUrl: string) {
		return this.shortenUrlService.findByShortenedUrl(
			this.agentContext,
			shortenedUrl,
		);
	}
}
