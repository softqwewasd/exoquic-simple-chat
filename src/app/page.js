"use client"

import { useEffect, useState } from "react";
import { SubscriptionManager } from "@exoquic/sub";

// This is the subscription manager, it doesn't do much right now,
// but sooner rather than later it will be caching subscriptions and
// events, decreasing the egress costs significantly :)
export const subscriptionManager = new SubscriptionManager(async () => {
  const response = await fetch("/api/authorize-subscribers");
  const data = await response.json();
  return data.subscriptionToken;
});

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const startChatting = () => {
    if (nickname.trim() !== "") {
      setChatStarted(true);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const message = {
      sender: nickname,
      message: newMessage,
    };

    await fetch("/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    setNewMessage("");
  };

  // This useEffect is where we retrieve an subscription token and subscribe to the "simple-chat" topic.
  useEffect(() => {
    if (!chatStarted) return;

    let subscriber = null;
    (async () => {
      // Authorize the subscriber
      subscriber = await subscriptionManager.authorizeSubscriber();

      // Subscribe to the "simple-chat" topic
      subscriber.subscribe(rawEventBatch => {
        const parsedEventBatchWithRawMessages = JSON.parse(rawEventBatch.data);
        const eventBatch = parsedEventBatchWithRawMessages.map(rawEventJson => JSON.parse(rawEventJson));
        
        setMessages(prevMessages => [...prevMessages, ...eventBatch]);
      })
    })()

    return () => {
      if (subscriber) {
        // Unsubscribe from the "simple-chat" topic when component unmounts
        subscriber.unsubscribe();
        setMessages([]);
      }
    }
    
  }, [chatStarted]);

  return (
    <div style={{ padding: "20px" }}>
      {!chatStarted ? (
        <div>
          <h1 style={{marginBottom: "20px"}}>Welcome to the Simple Chat App built with <a href="https://exoquic.com" style={{textDecoration: "underline"}}>Exoquic.com</a></h1>
          <input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ padding: "10px", fontSize: "16px", width: "300px" }}
          />
          <button
            onClick={startChatting}
            style={{ padding: "10px", marginLeft: "10px", fontSize: "16px" }}
          >
            Start Chatting
          </button>
        </div>
      ) : (
        <div>
          <h1>Chat Room</h1>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              height: "300px",
              overflowY: "scroll",
              marginBottom: "10px",
            }}
          >
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div key={index}>
                  <strong>{msg.sender}:</strong> {msg.message}
                </div>
              ))
            ) : (
              <p>No messages yet.</p>
            )}
          </div>
          <input
            type="text"
            placeholder="Type your message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ padding: "10px", fontSize: "16px", width: "300px" }}
          />
          <button
            onClick={sendMessage}
            style={{ padding: "10px", marginLeft: "10px", fontSize: "16px" }}
          >
            Send
          </button>
        </div>
      )}

      <a href="https://exoquic.com" style={{ display: "block", marginTop: "20px", textDecoration: "underline" }}>Learn more about Exoquic</a>
    </div>
  );
}