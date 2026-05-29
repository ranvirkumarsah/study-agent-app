export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;

    if (record.lastError) {
      const nested = extractErrorMessage(record.lastError);
      if (nested !== 'Unknown error') return nested;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const nested = extractErrorMessage(record.errors[record.errors.length - 1]);
      if (nested !== 'Unknown error') return nested;
    }

    if (record.data && typeof record.data === 'object') {
      const data = record.data as { error?: { message?: string } };
      if (data.error?.message) return data.error.message;
    }
  }

  if (error instanceof Error) {
    const lastErrorMatch = error.message.match(/Last error:\s*(.+)$/is);
    if (lastErrorMatch?.[1]) return lastErrorMatch[1].trim();
    if (error.message) return error.message;
  }

  return 'Unknown error';
}

export function formatAiError(error: unknown): string {
  const message = extractErrorMessage(error);

  if (
    message.includes('insufficient_quota') ||
    message.includes('exceeded your current quota') ||
    message.toLowerCase().includes('quota')
  ) {
    return 'OpenAI account has insufficient quota. Add billing or credits at platform.openai.com, then try again.';
  }

  if (
    message.includes('invalid_api_key') ||
    message.includes('Incorrect API key') ||
    message.includes('authentication')
  ) {
    return 'OpenAI API key is missing or invalid. Check OPENAI_API_KEY in your .env file.';
  }

  if (message.includes('No output generated')) {
    return 'OpenAI request failed. Check OPENAI_API_KEY and your account quota at platform.openai.com.';
  }

  if (message === 'Unknown error') {
    return 'OpenAI request failed. Check OPENAI_API_KEY and billing at platform.openai.com.';
  }

  return `Could not generate a response: ${message}`;
}
