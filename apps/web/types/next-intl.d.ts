import type { Messages as GeneratedMessages } from './messages';

declare module 'use-intl' {
  interface AppConfig {
    Messages: GeneratedMessages;
  }
}

declare module 'use-intl/core' {
  interface AppConfig {
    Messages: GeneratedMessages;
  }
}
