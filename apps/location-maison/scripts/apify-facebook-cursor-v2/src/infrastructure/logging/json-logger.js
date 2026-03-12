class JsonLogger {
  constructor(baseContext = {}) {
    this.baseContext = { ...baseContext };
  }

  child(context = {}) {
    return new JsonLogger({ ...this.baseContext, ...context });
  }

  write(level, message, context = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.baseContext,
      ...(context || {}),
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  }

  info(message, context = {}) {
    this.write('info', message, context);
  }

  warn(message, context = {}) {
    this.write('warn', message, context);
  }

  error(message, context = {}) {
    this.write('error', message, context);
  }

  debug(message, context = {}) {
    this.write('debug', message, context);
  }
}

module.exports = { JsonLogger };
