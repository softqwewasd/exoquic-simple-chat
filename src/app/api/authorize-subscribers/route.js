
import * as exoquicAuth from "@exoquic/auth";
import { NextResponse } from "next/server";

// Initialize the subscription authorizer with your API key
exoquicAuth.initSubscriptionAuthorizer({ apiKey: process.env.EXOQUIC_API_KEY, serverUrl: `https://${process.env.EXOQUIC_ENV_CONTEXT}.exoquic.com` });

// Since this is just a simple chat, we only have the topic "chat", so any call to
// this endpoint will be authorized for the topic "chat".
export async function GET(req) {

	// A subscriber that subscribes with this subscription token, will receive all the stored events, and any
	// new events that are published to the topic "simple-chat".
  const subscriptionToken = await exoquicAuth.authorizeSubscription({
    topic: "simple-chat", // I am using the topic "simple-chat", because I am already using "chat" for a different app 
		channel: "one-channel-to-rule-them-all" // https://exoquic.com/docs/publishing-events#channel
  });

	return NextResponse.json({ subscriptionToken });
}