# AFJ Module URL Shortener

Based on https://didcomm.org/shorten-url/1.0

## Setup

To install dependencies:

```bash
bun install
```

## Usage

### Server (Mediator)

Minimal setup, other required parameters omitted

```ts
import { agentDependencies } from '@aries-framework/node'
import { Agent } from '@aries-framework/core'
import express from 'express'
import { ShortenUrlModule, ShortenUrlEventTypes, ShortenUrlStateChangedEvent, ShortenUrlState } from 'afj-module-url-shortener'

const app = express()

const agent = new Agent({
    config: {
        label: 'My agent',
    },
    modules: {
        shortenUrl: new ShortenUrlModule({
            httpBaseUrl: 'https://my-agent.com/s',
            expressApp: app
        })
    },
    dependencies: agentDependencies
})

agent.events.on<ShortenUrlStateChangedEvent>(ShortenUrlEventTypes.ShortenUrlStateChanged, async (event) => {
    if (event.payload.shortenUrlRecord.state !== ShortenUrlState.RequestReceived) return

    const mediatorRecord = await agent.mediationRecipient.findByConnectionId(
        event.payload.shortenUrlRecord.connectionId
    )

    if (
        !mediatorRecord ||
        mediatorRecord.role !== MediationRole.Mediator ||
        mediatorRecord.state !== MediationState.Granted
    ) {
        logger.debug("Mediator record doesn't exist or is not in granted state, not shortening url")
        await agent.modules.shortenUrl.declineShortenedUrlRequest({
            shortenUrlId: event.payload.shortenUrlRecord.id,
            description: 'Unauthorized',
            // TODO: none of these problem codes apply
            problemCode: ShortenUrlProblemCode.InvalidUrl,
        })
    }

    await agent.modules.shortenUrl.acceptShortenedUrlRequest({
        shortenUrlId: event.payload.shortenUrlRecord.id,
    })
})
```

## Edge (Mobile)

```ts
import { agentDependencies } from '@aries-framework/react-native'
import { Agent } from '@aries-framework/core'
import { ShortenUrlModule, ShortenUrlEventTypes, ShortenUrlStateChangedEvent, ShortenUrlState } from 'afj-module-url-shortener'
import { firstValueFrom } from 'rxjs'

const app = express()

const agent = new Agent({
    config: {
        label: 'My agent',
    },
    modules: {
        shortenUrl: new ShortenUrlModule()
    },
    dependencies: agentDependencies
})

const { outOfBandInvitation } = await agent.oob.createInvitation()

const mediatorConnection = await agent.mediationRecipient.findDefaultMediator()
if (!mediatorConnection) {
    throw new Error('No mediator connection found')
}

const invitationUrl = outOfBandInvitation.toUrl({ domain: 'https://example.com' })

// TODO: invalidate shortened url when connection is established
const shortenedUrlResponsePromise = firstValueFrom(
    agent.events.observable<ShortenUrlStateChangedEvent>(ShortenUrlEventTypes.ShortenUrlStateChanged).pipe(
        filter((event) => event.payload.shortenUrlRecord.originalUrl === invitationUrl),
        filter((event) => event.payload.shortenUrlRecord.state !== ShortenUrlState.RequestSent),
        first(),
        timeout(10000)
    )
)

await agent.modules.shortenUrl.requestShortenedUrl({
    connectionId: mediatorConnection.connectionId,
    goalCode: ShortenUrlGoalCode.ShortenOobV1,
    requestedValiditySeconds: 60 * 60 * 24, // 1 day
    url: invitationUrl,
})

const event = await shortenedUrlResponsePromise

if (
    event.payload.shortenUrlRecord.state !== ShortenUrlState.ShortenedUrlReceived ||
    !event.payload.shortenUrlRecord.shortenedUrl
) {
    throw new Error('Failed to shorten invitation url')
}

const shortenedInvitationUrl = event.payload.shortenUrlRecord.shortenedUrl
```

