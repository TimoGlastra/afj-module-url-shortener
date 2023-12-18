import type {
	MessageHandler,
	MessageHandlerInboundMessage,
} from "@aries-framework/core";
import { ShortenUrlService } from "../services";

import { ShortenedUrlMessage } from "../messages";

export class ShortenedUrlHandler implements MessageHandler {
	public supportedMessages = [ShortenedUrlMessage];

	public async handle(
		inboundMessage: MessageHandlerInboundMessage<ShortenedUrlHandler>,
	) {
		const shortenUrlService =
			inboundMessage.agentContext.dependencyManager.resolve(ShortenUrlService);

		await shortenUrlService.processShortenedUrlMessage(inboundMessage);
	}
}
