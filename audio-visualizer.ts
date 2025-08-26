import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Analyser } from './analyser';

@customElement('audio-visualizer')
export class AudioVisualizer extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationFrame: number | null = null;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _outputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private _inputNode!: AudioNode;
  
  static styles = css`
    :host {
      display: block;
      inline-size: 100%;
      block-size: 100%;
    }
    canvas {
      inline-size: 100%;
      block-size: 100%;
      background: var(--primary-color, #1a1a1a);
    }
  `;

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.setupCanvas();
    this.startAnimation();
  }

  private setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    window.addEventListener('resize', () => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
    });
  }

  private startAnimation() {
    const draw = () => {
      this.animationFrame = requestAnimationFrame(draw);
      this.drawVisualizer();
    };
    draw();
  }

  private drawVisualizer() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    if (this.inputAnalyser && this.outputAnalyser) {
      this.inputAnalyser.update();
      this.outputAnalyser.update();

      const inputData = this.inputAnalyser.data;
      const outputData = this.outputAnalyser.data;

      // Draw input waveform
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'var(--input-waveform, #00E676)';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      const sliceWidth = width / inputData.length;
      let x = 0;

      for (let i = 0; i < inputData.length; i++) {
        const v = inputData[i] / 128.0;
        const y = (v * height / 4) + (height / 4);

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      
      this.ctx.stroke();

      // Draw output waveform
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'var(--output-waveform, #4DEEEA)';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      x = 0;

      for (let i = 0; i < outputData.length; i++) {
        const v = outputData[i] / 128.0;
        const y = (v * height / 4) + (height * 3 / 4);

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      
      this.ctx.stroke();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  render() {
    return html`<canvas></canvas>`;
  }
}
