import type { Express } from "express";

/**
 * ShortenUrlModuleConfigOptions defines the interface for the options of the ShortenUrlModuleConfig class.
 * This can contain optional parameters that have default values in the config class itself.
 */
export interface ShortenUrlModuleConfigOptions {
	/**
	 * The base url of the shortened url. This is the url that will be used to redirect to the original url.
	 * Should only be provided if acting as **url-shortener**.
	 */
	httpBaseUrl?: string;

	/**
	 * The express app to register the shorten url handler on. This will enable fully automatic setup of url
	 * shortening for http(s) urls. If provided, the httpBaseUrl MUST also be provided, or else an error will be thrown.
	 * Should only be provided if acting as **url-shortener**.
	 */
	expressApp?: Express;
}

export class ShortenUrlModuleConfig {
	private options: ShortenUrlModuleConfigOptions;

	public constructor(options?: ShortenUrlModuleConfigOptions) {
		this.options = options ?? {};
	}

	/** See {@link ShortenUrlModuleConfigOptions.httpBaseUrl} */
	public get httpBaseUrl(): string | undefined {
		return this.options.httpBaseUrl;
	}

	/** See {@link ShortenUrlModuleConfigOptions.expressApp} */
	public get expressApp(): Express | undefined {
		return this.options.expressApp;
	}
}
