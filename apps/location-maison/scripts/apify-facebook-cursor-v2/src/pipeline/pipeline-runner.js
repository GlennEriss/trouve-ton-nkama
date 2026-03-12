class PipelineRunner {
  constructor(steps = []) {
    this.steps = steps;
  }

  async run(context) {
    for (const step of this.steps) {
      const stepLogger = context.logger.child({ step: step.name });
      const startedAt = Date.now();

      try {
        stepLogger.info('Step started');
        await step.execute({ ...context, logger: stepLogger });
        stepLogger.info('Step completed', { durationMs: Date.now() - startedAt });
      } catch (error) {
        context.errors.push({
          step: step.name,
          message: error?.message || 'Unknown error',
          code: error?.code || 'UNEXPECTED_ERROR',
          details: error?.details || null,
        });
        stepLogger.error('Step failed', {
          durationMs: Date.now() - startedAt,
          error: {
            message: error?.message,
            code: error?.code,
          },
        });
        throw error;
      }
    }

    return context;
  }
}

module.exports = { PipelineRunner };
