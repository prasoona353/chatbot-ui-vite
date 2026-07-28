import { LitElement } from "lit";

type Constructor<T = {}> = new (...args: any[]) => T;

export function DraggableMixin<T extends Constructor<LitElement>>(superClass: T) {
  class DraggableElement extends superClass {
    // Shared position variables mapped to the main UI templates
    protected _posX = window.innerWidth - 365;
    protected _posY = window.innerHeight - 590;
    protected _launcherX = window.innerWidth - 80;
    protected _launcherY = window.innerHeight - 80;
    
    // 🚀 FIXED: Added public click blocker state reference
    public isClickBlocked = false;

    private _isDraggingBox = false;
    private _isDraggingLauncher = false;
    private _dragStartX = 0;
    private _dragStartY = 0;

    // --- CHAT BOX PANEL DRAG LOGIC ---
    protected _startDragBox(e: MouseEvent | TouchEvent) {
      if ((e.target as HTMLElement).classList.contains('close-btn')) return;
      this._isDraggingBox = true;
      
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

      this._dragStartX = clientX - this._posX;
      this._dragStartY = clientY - this._posY;

      window.addEventListener("mousemove", this._onDragBox);
      window.addEventListener("mouseup", this._stopDragBox);
      window.addEventListener("touchmove", this._onDragBox, { passive: false });
      window.addEventListener("touchend", this._stopDragBox);
    }

    private _onDragBox = (e: MouseEvent | TouchEvent) => {
      if (!this._isDraggingBox) return;
      if (e instanceof TouchEvent) e.preventDefault(); 

      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

      this._posX = Math.max(10, Math.min(clientX - this._dragStartX, window.innerWidth - 345));
      this._posY = Math.max(10, Math.min(clientY - this._dragStartY, window.innerHeight - 490));
      
      const chatBoxNode = this.shadowRoot?.querySelector('.chat-box') as HTMLElement;
      if (chatBoxNode) {
        chatBoxNode.style.left = `${this._posX}px`;
        chatBoxNode.style.top = `${this._posY}px`;
      }
    };

    private _stopDragBox = () => {
      this._isDraggingBox = false;
      window.removeEventListener("mousemove", this._onDragBox);
      window.removeEventListener("mouseup", this._stopDragBox);
      window.removeEventListener("touchmove", this._onDragBox);
      window.removeEventListener("touchend", this._stopDragBox);
    };

    // --- LAUNCHER BUTTON DRAG LOGIC ---
    protected _startDragLauncher(e: MouseEvent | TouchEvent) {
      this._isDraggingLauncher = true;
      this.isClickBlocked = false; // Reset block on initial mouse click trigger
      
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

      this._dragStartX = clientX - this._launcherX;
      this._dragStartY = clientY - this._launcherY;

      window.addEventListener("mousemove", this._onDragLauncher);
      window.addEventListener("mouseup", this._stopDragLauncher);
      window.addEventListener("touchmove", this._onDragLauncher, { passive: false });
      window.addEventListener("touchend", this._stopDragLauncher);
    }

    private _onDragLauncher = (e: MouseEvent | TouchEvent) => {
      if (!this._isDraggingLauncher) return;
      if (e instanceof TouchEvent) e.preventDefault();

      // If the mouse starts drifting past a tiny dead-zone, lock the click blocker!
      this.isClickBlocked = true;

      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

      this._launcherX = Math.max(10, Math.min(clientX - this._dragStartX, window.innerWidth - 70));
      this._launcherY = Math.max(10, Math.min(clientY - this._dragStartY, window.innerHeight - 70));
      
      const launcherNode = this.shadowRoot?.querySelector('.launcher') as HTMLElement;
      if (launcherNode) {
        launcherNode.style.left = `${this._launcherX}px`;
        launcherNode.style.top = `${this._launcherY}px`;
      }

      if ((this as any).isOpen) {
        (this as any).isOpen = false;
        this.requestUpdate();
      }
    };

    private _stopDragLauncher = () => {
      this._isDraggingLauncher = false;
      
      // 🚀 FIXED: Retain the click lock for 100 milliseconds to absorb the browser's duplicate click event loop
      setTimeout(() => {
        this.isClickBlocked = false;
      }, 100);

      window.removeEventListener("mousemove", this._onDragLauncher);
      window.removeEventListener("mouseup", this._stopDragLauncher);
      window.removeEventListener("touchmove", this._onDragLauncher);
      window.removeEventListener("touchend", this._stopDragLauncher);
    };

    protected _alignChatWithLauncher() {
      let calculatedX = this._launcherX - 280;
      let calculatedY = this._launcherY - 490;

      this._posX = Math.max(10, Math.min(calculatedX, window.innerWidth - 345));
      this._posY = Math.max(10, Math.min(calculatedY, window.innerHeight - 490));

      setTimeout(() => {
        const chatBoxNode = this.shadowRoot?.querySelector('.chat-box') as HTMLElement;
        if (chatBoxNode) {
          chatBoxNode.style.left = `${this._posX}px`;
          chatBoxNode.style.top = `${this._posY}px`;
        }
      }, 10);
    }
  }

  return DraggableElement;
}
