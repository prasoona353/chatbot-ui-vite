import { LitElement, html, unsafeCSS } from "lit";
import type { TemplateResult } from "lit"; 
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { marked } from "marked";

import { DraggableMixin } from "./dragController";
import { ChatCache } from "./chat-cache";
import { getChatbotTemplate } from "./chatbot.html"; 
import chatbotStyles from "./chatbot.css?inline";

marked.setOptions({ breaks: true });

interface ChatMessage {
  text: string | TemplateResult;
  sender: "user" | "bot";
  rawMarkdown?: string;
}

@customElement("trading-chatbot")
export class TradingChatbot extends DraggableMixin(LitElement) {
  @property({ type: String, attribute: "api-url" }) apiUrl = "http://localhost:8000/api/chat";
  @property({ type: String, attribute: "bot-name" }) botName = "Trading Guide";
  @property({ type: String, attribute: "auth-token" }) authToken = ""; 
  @property({ type: String, attribute: "platform-id" }) platformId = "platform-one"; 

  @state() protected isOpen = false;
  @state() protected isLoading = false;
  @state() protected messages: ChatMessage[] = []; 

  static override styles = unsafeCSS(chatbotStyles);

  override connectedCallback() {
    super.connectedCallback();
    this._loadChatHistory();
  }

  // 🚀 FIXED: Template maps through type-safe method invocation pipeline
  protected override render(): TemplateResult {
    return getChatbotTemplate.call(this);
  }

  async sendMessage() {
    const input = this.shadowRoot?.getElementById('prompt') as HTMLInputElement;
    const promptText = input?.value.trim();
    if (!promptText || this.isLoading) return;

    this._prepareUiForMessage(promptText);
    input.value = ''; 

    try {
      const historyPayload = this._getFormattedHistory();
      const response = await this._fetchAiStream(promptText, historyPayload);
      if (!response.body) throw new Error("Empty stream.");

      this.messages = [...this.messages, { text: '', sender: 'bot', rawMarkdown: '' }];
      await this._readAndDecodeStream(response.body);
    } catch (error) {
      this._handleStreamError();
    }
  }

  private _prepareUiForMessage(promptText: string) {
    this.messages = [...this.messages, { text: promptText, sender: 'user', rawMarkdown: promptText }];
    this.isLoading = true;
    ChatCache.save(this.platformId, this.messages); // Invoke cache engine
    this._scrollToBottom();
  }

  private async _fetchAiStream(promptText: string, history: any[]): Promise<Response> {
    return fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        message: promptText,
        platform: this.platformId,
        history: history 
      })
    });
  }

  private async _readAndDecodeStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    let accumulatedReply = '';
    let networkBuffer = '';
    const botMsgIndex = this.messages.length - 1;

    try {
      for await (const chunk of this._convertStreamToIterable(body)) {
        if (this.isLoading) this.isLoading = false; 
        networkBuffer += decoder.decode(chunk, { stream: true });
        
        const result = this._parseBufferedLines(networkBuffer, accumulatedReply, botMsgIndex);
        accumulatedReply = result.reply;
        networkBuffer = result.buffer;
      }
    } finally {
      this.isLoading = false;
      ChatCache.save(this.platformId, this.messages); // Invoke cache engine
    }
  }

  private _convertStreamToIterable(body: ReadableStream<Uint8Array>): AsyncIterable<Uint8Array> {
    if (Symbol.asyncIterator in body) return body as unknown as AsyncIterable<Uint8Array>;
    const reader = (body as ReadableStream).getReader();
    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally { reader.releaseLock(); }
      }
    };
  }

  private _parseBufferedLines(buffer: string, currentReply: string, targetIndex: number) {
    const rawLines = buffer.split('\n');
    let updatedReply = currentReply;
    const leftoverLine = rawLines.pop() || ''; 

    for (const singleLine of rawLines) {
      const trimmedLine = singleLine.trim();
      if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
      
      const parsedToken = this._extractTokenData(trimmedLine);
      if (parsedToken) {
        updatedReply += parsedToken;
        this._updateUiWithToken(updatedReply, targetIndex);
      }
    }
    return { reply: updatedReply, buffer: leftoverLine };
  }

  private _extractTokenData(line: string): string | null {
    try {
      const parsedData = JSON.parse(line.slice(6));
      return parsedData.response || parsedData.reply || null;
    } catch { return null; }
  }

  private async _updateUiWithToken(replyText: string, targetIndex: number) {
    try {
      const cleanHtmlString = await marked.parse(replyText);
      this.messages[targetIndex].text = html`${unsafeHTML(cleanHtmlString)}`;
      this.messages[targetIndex].rawMarkdown = replyText; 
      this.requestUpdate(); 
      this._scrollToBottom();
    } catch {
      this.messages[targetIndex].text = replyText;
      this.requestUpdate();
    }
  }

  // 🚀 SEPARATED CONTEXT ROUTERS
  private async _loadChatHistory() {
    const cachedLogs = ChatCache.load(this.platformId);
    if (!cachedLogs) {
      this.messages = [{ text: "Hello! How can I assist you with your platform data today?", sender: "bot", rawMarkdown: "Hello! How can I assist you with your platform data today?" }];
      return;
    }

    try {
      const parsedHistory: ChatMessage[] = [];
      for (const log of cachedLogs) {
        if (log.sender === 'bot') {
          const cleanHtml = await marked.parse(log.rawMarkdown);
          parsedHistory.push({ sender: 'bot', text: html`${unsafeHTML(cleanHtml)}`, rawMarkdown: log.rawMarkdown });
        } else {
          parsedHistory.push({ sender: 'user', text: log.rawMarkdown, rawMarkdown: log.rawMarkdown });
        }
      }
      this.messages = parsedHistory;
      this.requestUpdate();
      this._scrollToBottom();
    } catch {
      this.messages = [];
    }
  }

  private _getFormattedHistory() {
    return this.messages
      .filter(m => m.rawMarkdown)
      .slice(-6)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.rawMarkdown as string
      }));
  }

  private _handleStreamError() {
    this.messages = [...this.messages, { text: 'Stream interaction dropped or failed.', sender: 'bot' }];
    this.isLoading = false;
    this._scrollToBottom();
  }

  private _scrollToBottom() {
    setTimeout(() => {
      const hist = this.shadowRoot?.getElementById('history');
      if (hist) hist.scrollTop = hist.scrollHeight;
    }, 10);
  }

  protected _toggleChat() { 
    // 🚀 FIXED: Direct variable check alignment to cleanly filter out drag events
    if (this.isClickBlocked) return;

    this.isOpen = !this.isOpen; 
    
    if (this.isOpen) {
      this._alignChatWithLauncher();
      this._scrollToBottom();
    }
  }

  
  protected _closeChat() { 
    this.isOpen = false; 
  }

}
