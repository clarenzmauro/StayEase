import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import './ChatModal.css';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  isRead: boolean;
  chatId: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientPhoto: string;
  isMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientPhoto,
  isMinimized,
  onMinimizedChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [currentUser.uid, recipientId]),
      where('receiverId', 'in', [currentUser.uid, recipientId]),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));

      setMessages(newMessages);

      // Count unread messages when minimized
      if (isMinimized) {
        const unreadMessages = snapshot.docs.filter(doc => {
          const messageData = doc.data() as Message;
          return messageData.receiverId === currentUser.uid && !messageData.isRead;
        });
        setUnreadCount(unreadMessages.length);
      } else {
        // Mark messages as read when not minimized
        const unreadMessages = snapshot.docs.filter(doc => {
          const messageData = doc.data() as Message;
          return messageData.receiverId === currentUser.uid && !messageData.isRead;
        });

        if (unreadMessages.length > 0) {
          const batch = writeBatch(db);
          
          unreadMessages.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
          });

          try {
            await batch.commit();
            setUnreadCount(0);
          } catch (error) {
            console.error('Error marking messages as read:', error);
          }
        }
      }

      scrollToBottom();
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUser, recipientId, isMinimized]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen && messages.length > 0 && !isMinimized) {
      setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      const chatId = [currentUser.uid, recipientId].sort().join('_');

      await addDoc(collection(db, 'messages'), {
        chatId,
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
      className={`chat-modal ${isMinimized ? 'minimized' : ''}`}
      style={{ right: '20px' }}
    >
      <div 
        className="chat-header"
        onClick={() => {
          onMinimizedChange(!isMinimized);
          if (!isMinimized) {
            setUnreadCount(0); // Reset unread count when maximizing
          }
        }}
      >
        <div className="chat-recipient-info">
          <img src={recipientPhoto || '/default-avatar.png'} alt={recipientName} className="recipient-photo" />
          <span className="recipient-name">{recipientName}</span>
          {isMinimized && unreadCount > 0 && (
            <span className="chat-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="minimize-button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimizedChange(!isMinimized);
              if (!isMinimized) {
                setUnreadCount(0); // Reset unread count when maximizing
              }
            }}
          >
            {isMinimized ? '▲' : '▼'}
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

      {!isMinimized && (
        <div className="chat-content">
          <div className="chat-messages" ref={messageContainerRef}>
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
                    {message.timestamp?.toDate()?.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {message.senderId === currentUser?.uid && (
                    <span className="message-status" title={message.isRead ? "Read" : "Sent"}>
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
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatModal;
