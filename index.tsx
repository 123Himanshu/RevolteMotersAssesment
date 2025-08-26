/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './audio-visualizer';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';

  private ws: WebSocket;
  private inputAudioContext = new (window.AudioContext ||
    window.webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext ||
    window.webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: var(--error-color);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      background: rgba(10, 10, 10, 0.8);
      backdrop-filter: blur(10px);
      padding: 1rem 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);

      button {
        position: relative;
        outline: none;
        border: none;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--secondary-bg, #141414);
        cursor: pointer;
        padding: 0;
        margin: 0;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          z-index: 0;
        }

        svg {
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
          width: 32px;
          height: 32px;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 230, 118, 0.3);

          svg {
            transform: scale(1.1);
          }
        }

        &:active {
          transform: translateY(0);
        }
      }

      #resetButton {
        background: var(--secondary-bg, #141414);
        
        svg {
          fill: var(--accent-color, #00E676);
        }
        
        &:hover {
          background: var(--secondary-bg, #141414);
          
          svg {
            fill: var(--accent-hover, #00FF84);
          }
        }
      }

      #startButton {
        background: var(--accent-color, #00E676);
        
        svg circle {
          fill: #FFFFFF;
        }
        
        &:hover {
          background: var(--accent-hover, #00FF84);
        }
      }

      #stopButton {
        background: var(--error-color, #FF3D71);
        
        svg rect {
          fill: #FFFFFF;
        }
        
        &:hover {
          background: #FF5286;
        }
      }

      button[disabled] {
        opacity: 0;
        transform: scale(0.8);
        pointer-events: none;
      }
    }
  `;

  constructor() {
    super();
    this.initAudio();
    this.initWebSocket();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private initWebSocket() {
    console.log('Attempting to connect to WebSocket server...');
    this.ws = new WebSocket('ws://localhost:3000');

    this.ws.onopen = () => {
      console.log('WebSocket connection established successfully');
      this.updateStatus('Connected to server');
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.audio) {
        this.nextStartTime = Math.max(
          this.nextStartTime,
          this.outputAudioContext.currentTime,
        );

        const audioBuffer = await decodeAudioData(
          decode(message.audio),
          this.outputAudioContext,
          24000,
          1,
        );
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () =>{
          this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime = this.nextStartTime + audioBuffer.duration;
        this.sources.add(source);
      } else if (message.interrupted) {
        console.log('Interruption signal received!');
        for(const source of this.sources.values()) {
          source.stop();
          this.sources.delete(source);
        }
        this.nextStartTime = 0;
      } else if (message.error) {
        this.updateError(message.error);
      }
    };

    this.ws.onclose = (event) => {
      this.updateStatus('Disconnected from server: ' + event.reason);
    };

    this.ws.onerror = (error) => {
      this.updateError('WebSocket error: ' + error.message);
    };

    this.outputNode.connect(this.outputAudioContext.destination);
  }

  private async initSession() {
    // Session management is now handled by the backend
    // We can send a reset message to the backend if needed
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ reset: true }));
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();

    this.updateStatus('Requesting microphone access...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Microphone access granted. Starting capture...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const blob = createBlob(pcmData);
          this.ws.send(JSON.stringify({ audio: blob.data, mimeType: blob.mimeType }));
        }
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Recording... Capturing PCM chunks.');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Stopping recording...');

    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateStatus('Recording stopped. Click Start to begin again.');
  }

  private reset() {
    this.session?.close();
    this.initSession();
    this.updateStatus('Session cleared.');
  }

  render() {
    return html`
      <div>
        <div class="controls">
          <button
            id="resetButton"
            @click=${this.reset}
            ?disabled=${this.isRecording}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>
          <button
            id="startButton"
            @click=${this.startRecording}
            ?disabled=${this.isRecording}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
          <button
            id="stopButton"
            @click=${this.stopRecording}
            ?disabled=${!this.isRecording}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>

        <div id="status"> ${this.error} </div>
        <audio-visualizer
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></audio-visualizer>
      </div>
    `;
  }
}
