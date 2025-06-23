
// Simple chat service without OpenAI dependency
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export class ChatService {
  private messages: ChatMessage[] = [];

  async sendMessage(content: string): Promise<ChatMessage> {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      role: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMessage);

    // Simple auto-response for offline mode
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      content: "I'm currently in offline mode. For payee classification, please use the main classification tools.",
      role: 'assistant',
      timestamp: new Date()
    };

    this.messages.push(assistantMessage);
    return assistantMessage;
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
  }
}

export const chatService = new ChatService();
