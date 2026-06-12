import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    service: process.env.SERVICE_NAME || 'hoteliq',
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      const { requestId, service, ...rest } = object;
      return {
        timestamp: new Date().toISOString(),
        requestId: requestId || 'system',
        service: service || 'hoteliq',
        ...rest,
      };
    },
  },
});
