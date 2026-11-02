import {App} from '../app';
import {BatchResponse, FidMulticastMessage, Message, MessagingTopicManagementResponse, MulticastMessage} from './messaging-api';
/** Firebase Cloud Messaging service owned by an app. Obtain it with getMessaging(). */
export declare class Messaging {
  #private;
  readonly app: App;
  /** Select HTTP/1.1 for subsequent send and topic batches. */
  enableLegacyHttpTransport(): void;
  send(message: Message, dryRun?: boolean): Promise<string>;
  /** Up to 500 messages; results preserve input order, including partial failures. */
  sendEach(messages: Message[], dryRun?: boolean): Promise<BatchResponse>;
  /** @deprecated Prefer the FidMulticastMessage overload for new callers. */
  sendEachForMulticast(message: MulticastMessage, dryRun?: boolean): Promise<BatchResponse>;
  sendEachForMulticast(message: FidMulticastMessage, dryRun?: boolean): Promise<BatchResponse>;
  /** Up to 1,000 tokens; no more than 100 requests run concurrently. */
  subscribeToTopic(tokens: string | string[], topic: string): Promise<MessagingTopicManagementResponse>;
  unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<MessagingTopicManagementResponse>;
  /** @deprecated Legacy Instance ID endpoint. */
  subscribeToTopicLegacy(tokens: string | string[], topic: string): Promise<MessagingTopicManagementResponse>;
  /** @deprecated Legacy Instance ID endpoint. */
  unsubscribeFromTopicLegacy(tokens: string | string[], topic: string): Promise<MessagingTopicManagementResponse>;
}
