import { serve } from "inngest/node";
import { inngest } from "../src/inngest/client.js";
import { processQueue } from "../src/inngest/functions/process-queue.js";

export default serve({
    client: inngest,
    functions: [processQueue],
});
