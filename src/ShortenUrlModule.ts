import type {
	DependencyManager,
	FeatureRegistry,
	Module,
} from "@aries-framework/core";
import type { ShortenUrlModuleConfigOptions } from "./ShortenUrlModuleConfig";

import { AriesFrameworkError, Protocol } from "@aries-framework/core";

import { ShortenUrlApi } from "./ShortenUrlApi";
import { ShortenUrlModuleConfig } from "./ShortenUrlModuleConfig";
import { expressShortenUrlHandler } from "./expressShortenUrlHandler";
import {
	InvalidateShortenedUrlHandler,
	RequestShortenedUrlHandler,
	ShortenedUrlHandler,
} from "./handlers";
import { ShortenUrlRepository } from "./repository";
import { ShortenUrlService } from "./services";

export class ShortenUrlModule implements Module {
	public readonly config: ShortenUrlModuleConfig;
	public readonly api = ShortenUrlApi;

	public constructor(config?: ShortenUrlModuleConfigOptions) {
		this.config = new ShortenUrlModuleConfig(config);
	}
	public register(
		dependencyManager: DependencyManager,
		featureRegistry: FeatureRegistry,
	): void {
		// Config
		dependencyManager.registerInstance(ShortenUrlModuleConfig, this.config);

		if (this.config.expressApp) {
			if (!this.config.httpBaseUrl) {
				throw new AriesFrameworkError(
					"Can't register express handler without httpBaseUrl",
				);
			}

			const baseUrl = new URL(this.config.httpBaseUrl);
			this.config.expressApp.get(
				[baseUrl.pathname, `${baseUrl.pathname}/:slug`],
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				expressShortenUrlHandler(dependencyManager),
			);
		}

		dependencyManager.registerMessageHandlers([
			new ShortenedUrlHandler(),
			new RequestShortenedUrlHandler(),
			new InvalidateShortenedUrlHandler(),
		]);

		featureRegistry.register(
			new Protocol({
				id: "https://didcomm.org/shorten-url/1.0",
				roles: ["url-shortener", "long-url-provider"],
			}),
		);

		dependencyManager.registerSingleton(ShortenUrlService);
		dependencyManager.registerSingleton(ShortenUrlRepository);
	}
}
