import { getRedisClient, publishMailboxEvent } from "./redis-server"

interface MailboxEvent {
  type: string
  payload: any
}

export async function publishEvent(mailboxId: string, event: MailboxEvent) {
  await publishMailboxEvent(mailboxId, event)
}

export async function subscribeToMailbox(mailboxId: string, callback: (event: MailboxEvent) => void) {
  const redis = getRedisClient()
  const subscriber = redis.duplicate()

  await subscriber.connect()
  await subscriber.subscribe(mailboxId, (message) => {
    const event: MailboxEvent = JSON.parse(message)
    callback(event)
  })

  return async () => {
    await subscriber.unsubscribe(mailboxId)
    await subscriber.quit()
  }
}
