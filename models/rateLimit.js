// Rate-limit data access: counts requests per key inside a time window.
const { RateLimit } = require('./schemas');

// Count one request for this key. A key's window starts at its first request and lasts windowMs; once it has passed,
// the next request starts a new window. The counting is a single atomic database update, so simultaneous requests
// cannot be undercounted. Returns { count, resetAt } for the window this request fell in.
exports.hit = async (key, windowMs) => {
  const run = () => {
    const now = new Date();
    const inWindow = { $gt: ['$resetAt', now] }; // false for a brand-new key (no resetAt yet) and for an ended window
    return RateLimit.findOneAndUpdate(
      { _id: key },
      [{ $set: {
        count: { $cond: [inWindow, { $add: ['$count', 1] }, 1] },
        resetAt: { $cond: [inWindow, '$resetAt', new Date(now.getTime() + windowMs)] },
      } }],
      { upsert: true, returnDocument: 'after', updatePipeline: true },
    ).lean();
  };
  try {
    return await run();
  } catch (err) {
    if (err.code !== 11000) throw err;
    return run(); // two first requests raced to create the document: the second simply counts onto it
  }
};
