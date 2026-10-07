import type { H3Event } from "h3";
import { getRequestHeader, getRequestURL, getResponseStatus, setResponseHeader } from "h3";

function logServerError(error: unknown, event: H3Event, source: string) {
  const errorStatus = typeof error === "object" && error && "statusCode" in error
    ? Number(error.statusCode)
    : 0;
  const status = errorStatus || getResponseStatus(event);
  if (status < 500 || event.context.serverErrorLogged)
    return;

  event.context.serverErrorLogged = true;
  const incomingRequestId = getRequestHeader(event, "x-request-id");
  const requestId = incomingRequestId && /^[\w-]{1,80}$/.test(incomingRequestId)
    ? incomingRequestId
    : crypto.randomUUID();
  const details = error instanceof Error ? error : new Error(String(error));

  if (source !== "afterResponse")
    setResponseHeader(event, "x-error-id", requestId);

  console.error(JSON.stringify({
    event: "server_http_error",
    source,
    requestId,
    method: event.method,
    path: getRequestURL(event).pathname,
    status,
    errorName: details.name,
    errorMessage: details.message,
    stack: details.stack,
  }));
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.options.onError = (error, event) => {
    logServerError(error, event, "h3");
  };

  nitroApp.hooks.hook("error", async (error, { event }) => {
    if (event)
      logServerError(error, event, "nitro");
  });

  nitroApp.hooks.hook("afterResponse", (event) => {
    if (getResponseStatus(event) >= 500)
      logServerError(new Error("Response completed with a server error"), event, "afterResponse");
  });
});
