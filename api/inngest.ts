import { serve } from "inngest/node";
import { inngest } from "../src/inngest/client";
import { processQueue } from "../src/inngest/functions/process-queue";

export default serve({
    client: inngest,
    functions: [
        processQueue
    ],
});
