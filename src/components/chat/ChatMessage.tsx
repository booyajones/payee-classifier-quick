
import { Bot, User } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    isBot: boolean;
    timestamp: Date;
  };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex gap-3 ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        message.isBot 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary text-secondary-foreground'
      }`}>
        {message.isBot ? (
          <Bot className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      
      <div className={`flex-1 ${message.isBot ? 'text-left' : 'text-right'}`}>
        <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
          message.isBot
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(message.timestamp, 'h:mm a')}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
