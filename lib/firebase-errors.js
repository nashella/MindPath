export function formatFirebaseError(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  const rawMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : '';

  const cleanedMessage = rawMessage.replace(/^Firebase:\s*/i, '').trim();

  if (errorCode && cleanedMessage) {
    return `${errorCode}: ${cleanedMessage}`;
  }

  if (cleanedMessage) {
    return cleanedMessage;
  }

  if (errorCode) {
    return errorCode;
  }

  return fallbackMessage;
}
