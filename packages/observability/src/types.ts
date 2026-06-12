export interface LogContext {
  requestId: string;
  timestamp: string;
  latency?: string;
  method?: string;
  path?: string;
  statusCode?: number;
}
