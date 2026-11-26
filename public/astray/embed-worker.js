// Runs a small sentence-embedding model in the browser, off the main thread, so the fall never
// stutters. Question text never leaves the device: only the library and the model weights are
// downloaded (once, then cached by the browser).
//
// Messages in:  { id, texts: string[] }
// Messages out: { id, vectors: number[][] } or { id, error: string }

const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
const MODEL = "Xenova/all-MiniLM-L6-v2";

let extractor = null;

async function load() {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline, env } = await import(LIBRARY);
      env.allowLocalModels = false;
      return pipeline("feature-extraction", MODEL, { dtype: "q8" });
    })();
    // A failed load can be retried next time rather than staying broken.
    extractor.catch(() => {
      extractor = null;
    });
  }
  return extractor;
}

self.onmessage = async (event) => {
  const { id, texts } = event.data;
  try {
    const embed = await load();
    if (texts.length === 0) {
      self.postMessage({ id, vectors: [] });
      return;
    }
    const output = await embed(texts, { pooling: "mean", normalize: true });
    self.postMessage({ id, vectors: output.tolist() });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
