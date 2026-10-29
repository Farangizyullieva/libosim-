export function successRes<T>(
  data: T,
  message = 'Success',
  statusCode = 200,
) {
  return {
    success: true,
    statusCode,
    message,
    data,
  };
}
