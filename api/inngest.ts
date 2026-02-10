import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { serve } = require("inngest/node");
const { Inngest } = require("inngest");

// Initialize Inngest client locally to avoid import issues from other files
const inngest = new Inngest({ id: "pilger-eventos" });

const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        return { message: "Hello Inngest!" };
    }
);

export default serve({
    client: inngest,
    functions: [helloWorld],
});
