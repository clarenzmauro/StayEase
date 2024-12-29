import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import './ChatModal.css';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  isRead: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientPhoto: string;
  initialPosition?: number;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientPhoto,
  initialPosition = 0,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    // Create a unique chat ID by sorting and combining user IDs
    const chatId = [currentUser.uid, recipientId].sort().join('_');

    // Subscribe to messages
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(newMessages);
      
      // Mark received messages as read
      snapshot.docs.forEach(async (doc) => {
        const messageData = doc.data() as Message;
        if (messageData.receiverId === currentUser.uid && !messageData.isRead) {
          await updateDoc(doc.ref, { isRead: true });
        }
      });
      
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [isOpen, currentUser, recipientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const chatId = [currentUser.uid, recipientId].sort().join('_');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        content: newMessage,
        senderId: currentUser.uid,
        receiverId: recipientId,
        timestamp: serverTimestamp(),
        isRead: false,
      });

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`chat-modal ${isCollapsed ? 'collapsed' : ''}`}
      style={{ right: `${20 + (initialPosition * 360)}px` }}
    >
      <div 
        className="chat-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="chat-recipient-info">
          <img src={recipientPhoto} alt={recipientName} className="recipient-photo" />
          <span className="recipient-name">{recipientName}</span>
        </div>
        <div className="header-actions">
          <button 
            className="minimize-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button 
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-info">
                <span className="message-timestamp">
                  {message.timestamp?.toDate().toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {message.senderId === currentUser?.uid && (
                  <span className="message-status">
                    {message.isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit" disabled={!newMessage.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
