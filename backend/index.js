require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { GoogleGenAI, Modality } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

wss.on('connection', ws => {
  console.log('New client connected');
  console.log('Total connected clients:', wss.clients.size);

  let session;

  const model = 'gemini-2.5-flash-preview-native-audio-dialog';
  const SYSTEM_INSTRUCTIONS = `You are a helpful AI assistant for Revolt Motors, an electric vehicle company. 
You should only provide information about Revolt Motors products, services, and electric vehicles in general.

IMPORTANT: Respond in the same language as the user's question. If they ask in Hindi, respond in Hindi. If they ask in English, respond in English.

Key points about Revolt Motors:
- Revolt Motors is an Indian electric vehicle manufacturer
- They produce electric motorcycles and scooters
- Focus on sustainable transportation solutions
- Provide information about their vehicle lineup, features, pricing, and dealership locations
- If asked about other topics, politely redirect the conversation back to Revolt Motors

Keep responses conversational, helpful, and focused on electric vehicles and Revolt Motors.`;

  const initSession = async () => {
    try {
      session = await genAI.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log('GenAI session opened');
          },
          onmessage: async (message) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (audio) {
              ws.send(JSON.stringify({ audio: audio.data }));
            }
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              ws.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (e) => {
            console.error('GenAI session error:', e);
            ws.send(JSON.stringify({ error: e.message }));
          },
          onclose: (e) => {
            console.log('GenAI session closed:', e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          systemInstruction: SYSTEM_INSTRUCTIONS,
        },
      });
    } catch (e) {
      console.error('Error initializing GenAI session:', e);
      ws.send(JSON.stringify({ error: e.message }));
    }
  };

  initSession();

  ws.on('message', async message => {
    const data = JSON.parse(message);
    if (data.audio && data.mimeType) {
      if (session) {
        session.sendRealtimeInput({ media: { data: data.audio, mimeType: data.mimeType } });
      } else {
        console.warn('Session not initialized, dropping audio chunk.');
      }
    } else if (data.reset) {
      if (session) {
        session.close();
      }
      initSession();
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (session) {
      session.close();
    }
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});