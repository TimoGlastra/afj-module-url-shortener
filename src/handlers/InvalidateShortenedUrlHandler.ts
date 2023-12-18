import type {
	MessageHandler,
	MessageHandlerInboundMessage,
} from "@aries-framework/core";
import { ShortenUrlService } from "../services";

import {
	AckMessage,
	AckStatus,
	getOutboundMessageContext,
} from "@aries-framework/core";

import { InvalidateShortenedUrlMessage } from "../messages";
import { ShortenUrlState } from "../models";

export class InvalidateShortenedUrlHandler implements MessageHandler {
	public supportedMessages = [InvalidateShortenedUrlMessage];

	public async handle(
		inboundMessage: MessageHandlerInboundMessage<InvalidateShortenedUrlHandler>,
	) {
		const connectionRecord = inboundMessage.assertReadyConnection();
		const shortenUrlService =
			inboundMessage.agentContext.dependencyManager.resolve(ShortenUrlService);

		const shortenUrlRecord =
			await shortenUrlService.processInvalidateShortenedUrlMessage(
				inboundMessage,
			);

		const ack = new AckMessage({
			status: AckStatus.OK,
			threadId: inboundMessage.message.threadId,
		});

		const message = await getOutboundMessageContext(
			inboundMessage.agentContext,
			{ connectionRecord, message: ack },
		);
		shortenUrlService.updateState(
			inboundMessage.agentContext,
			shortenUrlRecord,
			ShortenUrlState.Invalidated,
		);

		return message;
	}
}
