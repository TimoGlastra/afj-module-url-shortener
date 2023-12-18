import type { DependencyManager } from "@aries-framework/core";
import type { Request, Response } from "express";

import { OutOfBandInvitation } from "@aries-framework/core";

import { ShortenUrlApi } from "./ShortenUrlApi";
import { ShortenUrlGoalCode } from "./models";
import { isInvalidShortUrl } from "./shortUrlUtils";

export function expressShortenUrlHandler(dependencyManager: DependencyManager) {
	const shortenUrlApi = dependencyManager.resolve(ShortenUrlApi);

	return async (req: Request, res: Response) => {
		const slug = req.params.slug;
		let isOobV2Request = false;

		let shortenUrlRecord = undefined;

		// Handle shorten.oobv2 strategy
		if (typeof req.query._oobid === "string") {
			isOobV2Request = true;
			const oobId = req.query._oobid;

			shortenUrlRecord = await shortenUrlApi.findByShortUrlSlug(oobId);
		} else if (slug) {
			// All other strategies use the slug, so if there is no slug, we return 404
			shortenUrlRecord = await shortenUrlApi.findByShortUrlSlug(slug);
		}

		if (!shortenUrlRecord || isInvalidShortUrl(shortenUrlRecord)) {
			return res.status(404).send("Not found");
		}

		// first handle oobv2 as the request is different
		if (
			isOobV2Request &&
			shortenUrlRecord.shortenStrategy === ShortenUrlGoalCode.ShortenOobV2
		) {
			return res.redirect(shortenUrlRecord.originalUrl);
		}
		if (shortenUrlRecord.shortenStrategy === ShortenUrlGoalCode.Shorten) {
			return res.redirect(shortenUrlRecord.originalUrl);
		}
		if (shortenUrlRecord.shortenStrategy === ShortenUrlGoalCode.ShortenOobV1) {
			// Always return json variant of the message, for ease of processing
			const invitation = OutOfBandInvitation.fromUrl(
				shortenUrlRecord.originalUrl,
			);
			return res
				.setHeader("Content-Type", "application/json; charset=utf-8")
				.json(invitation.toJSON());
		}

		return res.status(404).send("Not found");
	};
}
