import "server-only";

const encoder = new TextEncoder();

/**
 * Writes newline-delimited JSON into a streaming response, safely: once the visitor has gone
 * (closed the tab, climbed out mid-stream), writes and the final close are quietly skipped
 * instead of throwing on a stream that's already been cancelled.
 */
export function ndjsonWriter(controller: ReadableStreamDefaultController<Uint8Array>, signal: AbortSignal) {
  let open = true;
  return {
    send(event: unknown) {
      if (!open || signal.aborted) return;
      try {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } catch {
        open = false; // The reader went away between the check and the write.
      }
    },
    close() {
      if (!open) return;
      open = false;
      try {
        controller.close();
      } catch {
        // Already closed by the visitor leaving.
      }
    },
  };
}
