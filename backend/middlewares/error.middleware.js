const errorMiddleware = (err, req, res, next) => {
  const status = err.status || 500;

  const message =
    err.status ? err.message : "Internal Server Error";

  // optional: log error 
  console.error(err);

  res.status(status).json({
    success: false,
    message
  });
};

export default errorMiddleware;
