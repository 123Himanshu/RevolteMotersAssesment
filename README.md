# Revolt Motors AI Assistant

A voice-controlled AI assistant specifically tailored for Revolt Motors, demonstrating a server-to-server architecture for interacting with the Google Gemini Live API.

## Author
Himanshu Chaprana

## Features

-   **Voice Interaction:** Engage with the AI assistant using your voice.
-   **Revolt Motors Persona:** The AI is configured to act as an assistant for Revolt Motors, focusing solely on their products and related information. It will politely decline to answer questions outside this scope.
-   **Real-time Audio Streaming:** Seamless real-time audio input and output for a natural conversational experience.
-   **Server-to-Server Architecture:** The frontend communicates with a Node.js/Express backend via WebSockets, which then relays the audio and interacts with the Google Gemini Live API. This ensures your API key is securely managed on the server-side.
-   **Interruption Handling:** You can interrupt the AI while it is speaking. The AI will stop, listen to your new input, and respond appropriately.

## Technologies Used

### Frontend

-   **LitElement:** For building fast, lightweight web components.
-   **TypeScript:** For type-safe JavaScript development.
-   **Vite:** A fast build tool for modern web projects.

### Backend

-   **Node.js:** JavaScript runtime environment.
-   **Express.js:** Web framework for Node.js.
-   **WebSockets (`ws`):** For real-time, bidirectional communication between the frontend and backend.
-   **`@google/genai`:** Google's official library for interacting with the Gemini API.
-   **`dotenv`:** For loading environment variables from a `.env` file.

## Architecture Overview

The application follows a server-to-server architecture:

1.  **Frontend (Browser):** Captures microphone audio and streams it over a WebSocket connection to the Node.js backend.
2.  **Node.js Backend:** Receives the audio stream from the frontend. It then establishes a `GoogleGenAI.live.connect` session and forwards the audio chunks to the Google Gemini Live API. It also applies the system instruction to ensure the AI's persona.
3.  **Google Gemini Live API:** Processes the audio input, generates a voice response, and streams it back to the Node.js backend.
4.  **Node.js Backend:** Receives the AI's audio response and streams it back to the frontend over the same WebSocket connection.
5.  **Frontend (Browser):** Receives the AI's audio and plays it back to the user.

This setup ensures that your Google Gemini API key is never exposed on the client-side.

## Setup Instructions

Follow these steps to get the project up and running on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/himanshu-chaprana/RevoltMotersAssesment.git
cd revolt-motors-assessment
```

### 2. Backend Setup

Navigate into the backend directory and install dependencies:

```bash
cd server
npm install
```

### 3. Configure API Key

Create a `.env` file in the `server` directory with your Google Gemini API Key:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key obtained from the Google AI Studio or Google Cloud Console.

### 4. Frontend Setup

Navigate back to the project root directory and install frontend dependencies:

```bash
cd ..
npm install
```

## How to Run

To run the application, you need to start both the backend server and the frontend development server.

### 1. Start the Backend Server

Open a new terminal, navigate to the `server` directory, and run:

```bash
cd server
npm start
```

This will start the WebSocket server, listening on `http://localhost:3000`.

### 2. Start the Frontend

Open another new terminal, navigate to the project root directory, and run:

```bash
cd .. # If you are still in server directory
npm run dev
```

This will start the Vite development server and open the application in your default browser.

## Usage

Once both servers are running and the application is open in your browser:

1.  Click the **button** to start recording your voice.
2.  Speak your query. The AI will respond verbally.
3.  To interrupt the AI while it's speaking, simply start talking again (ensure the recording is still active). The AI will stop its current response and listen to your new input.
4.  Click the **square button** to stop recording.
5.  Click the **reset button**  to clear the session and start a new conversation.

Enjoy interacting with your Revolt Motors AI Assistant!
