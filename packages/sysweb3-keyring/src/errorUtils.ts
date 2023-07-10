export function handleStatusCodeError(
  statusCode: number,
  errorMessage: string
) {
  switch (statusCode) {
    case 400:
      console.error({
        errorMessage,
        message:
          'Bad Request: The current provider(RPC) could not understand the request due to invalid syntax.',
      });
      break;
    case 401:
      console.error({
        errorMessage,
        message: 'Unauthorized: The request requires user authentication.',
      });
      break;
    case 403:
      console.error({
        errorMessage,
        message:
          'Forbidden: You do not have the necessary permissions for the resource.',
      });
      break;
    case 404:
      console.error({
        errorMessage,
        message: 'Not Found: The requested RPC method could not be found.',
      });
      break;
    case 405:
      console.error({
        errorMessage,
        message:
          'Method Not Allowed: The request method is known by the current provider but is not supported by the target resource.',
      });
      break;
    case 408:
      console.error({
        errorMessage,
        message:
          'Request Timeout: The current provider(RPC) would like to shut down the unused connection.',
      });
      break;
    case 413:
      console.error({
        errorMessage,
        message:
          'Payload Too Large: The request entity is larger than limits defined by the server.',
      });
      break;
    case 429:
      console.error({
        errorMessage,
        message:
          'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.',
      });
      throw {
        errorMessage,
        message:
          'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.',
      };
    case 500:
      console.error({
        errorMessage,
        message:
          'Internal Server Error: The current provider(RPC) encountered an unexpected condition that prevented it from fulfilling the request.',
      });
      break;
    case 503:
      console.error({
        errorMessage,
        message:
          'Service Unavailable: The current provider(RPC) is not ready to handle the request, possibly due to being down for maintenance or overloaded.',
      });
      break;
    default:
      throw {
        message: `Unexpected HTTP status code: ${statusCode}`,
      };
  }
}
