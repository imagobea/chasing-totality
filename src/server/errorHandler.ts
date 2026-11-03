// The app's error handler, for errors thrown by any route

import { STATUS_CODES } from "node:http";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // Fastify answers 400 for a request that fails its schema; well-formed but invalid input is
  // 422. The default handler takes the status from the error, so set it there.
  if (error.validation) error.statusCode = 422;

  // Server errors are logged in full but answered generically, so internals like file paths
  // don't leak. An error without an error status (400 and up) counts as one.
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  if (statusCode >= 500) {
    request.log.error({ err: error }, error.message);
    const message = STATUS_CODES[statusCode];
    return reply.code(statusCode).send({ statusCode, error: message, message });
  }

  throw error;
}
