import { serve } from "inngest/node";
import { inngest } from "./_lib/inngest/client";
const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        return { message: "Hello Inngest!" };
    }
);

export default serve({
    client: inngest,
    functions: [helloWorld], // processQueue temporarily removed
});
