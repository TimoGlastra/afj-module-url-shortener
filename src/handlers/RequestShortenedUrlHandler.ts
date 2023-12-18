import type {
	MessageHandler,
	MessageHandlerInboundMessage,
} from "@aries-framework/core";
import { ShortenUrlService } from "../services";

import { RequestShortenedUrlMessage } from "../messages";

export class RequestShortenedUrlHandler implements MessageHandler {
	public supportedMessages = [RequestShortenedUrlMessage];

	public async handle(
		inboundMessage: MessageHandlerInboundMessage<RequestShortenedUrlHandler>,
	) {
		const shortenUrlService =
			inboundMessage.agentContext.dependencyManager.resolve(ShortenUrlService);
		await shortenUrlService.processRequestShortenedUrlMessage(inboundMessage);
	}
}
