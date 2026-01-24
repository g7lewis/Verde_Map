import { z } from 'zod';
import { insertPinSchema, pins, analysisResponseSchema, insertEmailSubscriberSchema, emailSubscribers } from './schema';

export const api = {
  pins: {
    list: {
      method: 'GET' as const,
      path: '/api/pins',
      responses: {
        200: z.array(z.custom<typeof pins.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/pins',
      input: insertPinSchema,
      responses: {
        201: z.custom<typeof pins.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
  subscribers: {
    create: {
      method: 'POST' as const,
      path: '/api/subscribe',
      input: z.object({
        email: z.string().email(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        locationName: z.string().optional(),
      }),
      responses: {
        201: z.object({ message: z.string() }),
        400: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }),
      },
    },
  },
  analysis: {
    analyze: {
      method: 'POST' as const,
      path: '/api/analyze',
      input: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      responses: {
        200: analysisResponseSchema,
        500: z.object({ message: z.string() }),
      },
    },
    askQuestion: {
      method: 'POST' as const,
      path: '/api/ask',
      input: z.object({
        lat: z.number(),
        lng: z.number(),
        location: z.string(),
        question: z.string(),
      }),
      responses: {
        200: z.object({ answer: z.string() }),
        500: z.object({ message: z.string() }),
      },
    },
  },
};

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
};

// DO NOT FORGET to include this function.
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
