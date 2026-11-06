
import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    const question = input.trim();

    if (!question || isLoading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: question,
            history: messages,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const result = await response.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: result.response,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "I couldn't connect to the chat service. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="chat-container">
      <h2>AI Communication Assistant</h2>

      <p>
        Ask me about communication, interviews, presentations,
        meetings, or general topics.
      </p>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <h3>How can I help you?</h3>
            <p>Try asking:</p>
            <p>How can I improve my public speaking?</p>
            <p>How should I prepare for an interview?</p>
            <p>Explain effective communication.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.role}`}
          >
            <strong>
              {message.role === "user" ? "You" : "Assistant"}
            </strong>
            <p>{message.content}</p>
          </div>
        ))}

        {isLoading && (
          <p className="chat-loading">Assistant is responding...</p>
        )}
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
          placeholder="Ask me anything..."
          disabled={isLoading}
        />

        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          Send
        </button>
      </div>
    </section>
  );
}

export default ChatAssistant;
