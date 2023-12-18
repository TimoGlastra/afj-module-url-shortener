import type { BaseEvent } from "@aries-framework/core";
import type { ShortenUrlState } from ".";
import type { ShortenUrlRecord } from "../repository";

export enum ShortenUrlEventTypes {
	ShortenUrlStateChanged = "ShortenUrlStateChanged",
}
export interface ShortenUrlStateChangedEvent extends BaseEvent {
	type: typeof ShortenUrlEventTypes.ShortenUrlStateChanged;
	payload: {
		shortenUrlRecord: ShortenUrlRecord;
		previousState: ShortenUrlState | null;
	};
}
