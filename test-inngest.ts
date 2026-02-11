import { Inngest } from "inngest";
import * as dotenv from 'dotenv';
dotenv.config();

const inngest = new Inngest({
    id: "pilger-eventos",
    eventKey: process.env.INNGEST_EVENT_KEY
});

async function testInngest() {
    console.log("Testing Inngest connection...");
    console.log("Event Key Present:", !!process.env.INNGEST_EVENT_KEY);

    try {
        await inngest.send({
            name: "app/process.queue",
            data: {
                test: true,
                timestamp: new Date().toISOString()
            }
        });
        console.log("Successfully sent test event to Inngest!");
    } catch (error) {
        console.error("Failed to send event:", error);
    }
}

testInngest();
