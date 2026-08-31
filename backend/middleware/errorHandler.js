function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || "Internal Server Error",
  };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(status).json(response);
}

module.exports = errorHandler;
