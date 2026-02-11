import { serve } from "inngest/node";
import { Inngest } from "inngest";

// 1. Create a minimal client specifically for this debug file
const debugInngest = new Inngest({ id: "debug-client" });

// 2. Create a simple hello world function
const helloWorld = debugInngest.createFunction(
    { id: "debug-hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        return { message: "Hello from Inngest Debug!" };
    }
);

// 3. Serve the handler
export default serve({
    client: debugInngest,
    functions: [helloWorld],
});
