import { ExoquicPublisher } from "@exoquic/pub";

const exoquicPublisher = new ExoquicPublisher({ apiKey: process.env.EXOQUIC_API_KEY });

export async function POST(req) {
  const body = await req.json();
  
  if (!body.message || !body.sender) {
    return new Response(JSON.stringify({ error: "Message and sender are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Publish the message to the 'simple-chat' topic on the 'one-channel-to-rule-them-all' channel,
  // ensuring that the messages are ordered when the subscriber receives them.
  const payload = JSON.stringify({ message: body.message, sender: body.sender })
  await exoquicPublisher.publish({
    topic: "simple-chat",
    channel: "one-channel-to-rule-them-all",
    payload
  });

  console.log(`Payload ${payload} sent to Exoquic`);
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}