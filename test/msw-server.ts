// test/msw-server.ts
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

export const server = setupServer(...handlers);
