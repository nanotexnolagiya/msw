import * as path from 'path'
import { SetupWorkerApi, rest, graphql } from 'msw'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'
import { runBrowserWith } from '../../../../support/runBrowserWith'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    graphql: typeof graphql
  }
}

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'suggestions.mocks.ts'))
}

describe('REST API', () => {
  test('does not suggest any handlers when there are no similar ones', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.get('/user', () => null),
        rest.post('/user-contact-details', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/user-details'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggests a similar request handler of the same method', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(rest.get('/user', () => null))
    })

    await runtime.request({
      url: runtime.makeUrl('/users'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggest a handler of a different method if its URL is similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.get('/user', () => null),
        rest.post('/user-contact-details', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/users'),
      fetchOptions: {
        method: 'POST',
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • POST /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggests multiple similar handlers regardless of their method', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, rest } = window.msw
      worker.use(
        rest.post('/payment', () => null),
        rest.get('/payments', () => null),
      )
    })

    await runtime.request({
      // Intentional typo in the request URL.
      url: runtime.makeUrl('/pamyents'),
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /pamyents

Did you mean to request one of the following resources instead?

  • GET /payments
  • POST /payment

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })
})

describe('GraphQL API', () => {
  test('does not suggest any handlers when there are no similar ones', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('SubmitCheckout', () => null),
        graphql.query('GetUserPaymentHistory', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query PaymentHistory {
              creditCard {
                number
              }
            }
          `,
        }),
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query PaymentHistory (POST /graphql)

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggests a similar request handler of the same operation type', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('GetLatestActiveUser', () => null),
        graphql.query('GetUser', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetUsers {
              user {
                firstName
              }
            }
          `,
        }),
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query GetUsers (POST /graphql)

Did you mean to request "query GetUser (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggests a handler of a different operation type if its name is similar', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.query('GetCheckoutSummary', () => null),
        graphql.mutation('SubmitCheckout', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query SubmitCheckout {
              checkout {
                status
              }
            }
          `,
        }),
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query SubmitCheckout (POST /graphql)

Did you mean to request "mutation SubmitCheckout (origin: *)" instead?

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })

  test('suggests multiple similar handlers regardless of their operation type', async () => {
    const runtime = await createRuntime()
    const { messages } = captureConsole(runtime.page)

    runtime.page.evaluate(() => {
      const { worker, graphql } = window.msw
      worker.use(
        graphql.mutation('ActivateUser', () => null),
        graphql.query('ActiveUser', () => null),
      )
    })

    await runtime.request({
      url: runtime.makeUrl('/graphql'),
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query ActiveUsers {
              checkout {
                status
              }
            }
          `,
        }),
      },
    })

    const libraryWarnings = messages.warning.filter(filterLibraryLogs)
    const unhandledRequestWarning = libraryWarnings.find((text) => {
      return /\[MSW\] Warning: captured a request without a matching request handler/.test(
        text,
      )
    })

    expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • query ActiveUsers (POST /graphql)

Did you mean to request one of the following resources instead?

  • query ActiveUser (origin: *)
  • mutation ActivateUser (origin: *)

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    return runtime.cleanup()
  })
})
