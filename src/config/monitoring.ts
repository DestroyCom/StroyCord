import * as Sentry from '@sentry/node';

/**
 * Error reporting through GlitchTip (Sentry-protocol compatible).
 *
 * Disabled unless GLITCHTIP_DSN is set. Must be imported before anything else
 * in Bot.ts so uncaught exceptions / unhandled rejections are reported too.
 */
const { GLITCHTIP_DSN, GLITCHTIP_ENVIRONMENT, GLITCHTIP_RELEASE, NODE_ENV } = process.env;

const isEnabled = Boolean(GLITCHTIP_DSN);

if (isEnabled) {
  Sentry.init({
    dsn: GLITCHTIP_DSN,
    environment: GLITCHTIP_ENVIRONMENT || NODE_ENV || 'development',
    release: GLITCHTIP_RELEASE || undefined,
    // GlitchTip only needs errors — no performance tracing
    tracesSampleRate: 0,
  });
  console.log('[monitoring] GlitchTip error reporting enabled');
}

type MonitoringContext = {
  guildId?: string;
  [key: string]: unknown;
};

const applyContext = (scope: Sentry.Scope, context?: MonitoringContext) => {
  if (!context) return;
  const { guildId, ...extra } = context;
  if (guildId) scope.setTag('guildId', guildId);
  scope.setExtras(extra);
};

export const captureError = (error: unknown, context?: MonitoringContext) => {
  if (!isEnabled) return;
  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureException(error);
  });
};

/** Messages are grouped by their text in GlitchTip — keep variable parts (ids, urls) in the context. */
export const captureMessage = (message: string, context?: MonitoringContext, level: 'warning' | 'error' = 'error') => {
  if (!isEnabled) return;
  Sentry.withScope((scope) => {
    applyContext(scope, context);
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};
