import { serve } from "inngest/node";
import { inngest } from "./_lib/inngest/client";
import { processQueue } from "./_lib/inngest/process-queue";

export default serve({
    client: inngest,
    functions: [processQueue],
});
