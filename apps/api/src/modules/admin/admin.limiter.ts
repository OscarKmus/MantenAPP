import rateLimit from "express-rate-limit";

/**
 * Rate limiter for POST /api/admin/verify
 * 5 requests per 15 minutes per client IP.
 */
export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, res) => {
    res.status(429).json({ error: "rate_limited" });
  },
});
