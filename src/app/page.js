"use client"

import { useEffect, useState } from "react";
import { AuthorizedSubscriber, DEFAULT_AUTHORIZED_SUBSCRIPTION_SETTINGS, SubscriptionManager } from "@exoquic/sub";



// This is the subscription manager, it doesn't do much right now,
// but sooner rather than later it will be caching subscriptions and
// events, decreasing the egress costs significantly :)
export const subscriptionManager = new SubscriptionManager(async () => {
  const response = await fetch("/api/authorize-subscribers");
  const data = await response.json();
  return data.subscriptionToken;
});

let db;

/**
 * Open (or create) the database and return the instance.
 * 
 * @param {String} dbName - The name of the database.
 * @param {Number} version - The version of the database (for schema upgrades).
 * @returns {Promise<IDBDatabase>} - A promise that resolves with the DB instance.
 */
export async function openDatabase(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = (event) => {
      console.error("Error opening database", event);
      reject(event);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      // Create the object store if it doesn't already exist
      if (!db.objectStoreNames.contains("chat")) {
        const store = db.createObjectStore("chat", { autoIncrement: true });
        console.log("Created chat store");
      }
    };
  });
}

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

  useEffect(() => {
    if (!chatStarted) return;

    openDatabase("simple-chat-app", 1).then(db => {
      const chatStore = db.transaction(["chat"] , "readwrite").objectStore("chat");
      chatStore.getAll().onsuccess = (event) => {
        console.log("getall finished!", event.target.result);
        event.target.result.map(eventBatch => {
          return eventBatch.map(message => JSON.parse(message));
        }).forEach(messagesBatch => {
          setMessages(prevMessages => [...prevMessages, ...messagesBatch]);
        });
      };
    });
  }, [chatStarted]);

  // This useEffect is where we retrieve an subscription token and subscribe to the "simple-chat" topic.
  useEffect(() => {
    if (!chatStarted) return;

    let subscriber = null;

    (async () => {
      let subscriber;
      if (!localStorage.getItem("subscriptionToken")) {
        subscriber = await subscriptionManager.authorizeSubscriber();
      } else {
        subscriber = new AuthorizedSubscriber(localStorage.getItem("subscriptionToken"), DEFAULT_AUTHORIZED_SUBSCRIPTION_SETTINGS);
      }

      await openDatabase("simple-chat-app", 1);
      
      // Subscribe to the "simple-chat" topic
      subscriber.subscribe(rawEventBatch => {
        const parsedEventBatchWithRawMessages = JSON.parse(rawEventBatch.data);
        const transaction = db.transaction(["chat"] , "readwrite");
        const chatStore = transaction.objectStore("chat");
        chatStore.add(parsedEventBatchWithRawMessages);

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