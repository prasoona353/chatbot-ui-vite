import { html } from "lit";

export function getChatbotTemplate(this: any) {
  return html`
    <!-- 🚀 UPDATED LAUNCHER: Handlers bound directly to tracking mixin coordinates -->
    <button 
      class="launcher" 
      .style="${`left: ${this._launcherX}px; top: ${this._launcherY}px; bottom: auto; right: auto;`}"
      @mousedown="${this._startDragLauncher}" 
      @touchstart="${this._startDragLauncher}"
      @click="${this._toggleChat}">
      💬
    </button>

    ${this.isOpen
      ? html`
          <div class="chat-box">
            <!-- 🚀 UPDATED CHAT BOX HEADER: Points cleanly to independent panel trackers -->
            <div class="header" @mousedown="${this._startDragBox}" @touchstart="${this._startDragBox}">
              <span>${this.botName}</span>
              <button class="close-btn" @click="${this._closeChat}">×</button>
            </div>

            <div class="history" id="history">
              ${this.messages.map(
                (msg: any) => html`<div class="bubble ${msg.sender}">${msg.text}</div>`
              )}
              
              ${this.isLoading
                ? html`
                    <div class="bubble bot">
                      <div class="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  `
                : ""}
            </div>

            <div class="input-bar">
              <input
                id="prompt" 
                type="text" 
                placeholder="Type here..."
                @keyup="${(e: KeyboardEvent) => e.key === 'Enter' && this.sendMessage()}"
              />
              <button @click="${this.sendMessage}">Send</button>
            </div>
          </div>
        `
      : ""}
  `;
}
