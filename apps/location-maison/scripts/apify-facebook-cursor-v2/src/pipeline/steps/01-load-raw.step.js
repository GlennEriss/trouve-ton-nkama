module.exports = {
  name: '01-load-raw',
  async execute(context) {
    const rawPosts = await context.adapters.rawSource.loadRaw(context.job.inputFile);
    context.artifacts.rawPosts = rawPosts;
    context.metrics.totalRaw = rawPosts.length;
    context.logger.info('Raw posts loaded', { totalRaw: rawPosts.length, inputFile: context.job.inputFile });
  },
};
