import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import ChatModal from './ChatModal';
import './ChatHistory.css';
import chatIcon from '../../assets/chat-icon.png';

interface ChatHistoryItem {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientPhoto: string;
  lastMessage: string;
  timestamp: any;
  unreadCount: number;
}

const ChatHistory: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatHistoryItem | null>(null);
  const [isChatModalMinimized, setIsChatModalMinimized] = useState(false);
  const currentUser = auth.currentUser;

  const handleChatModalStateChange = (minimized: boolean) => {
    setIsChatModalMinimized(minimized);
    if (!minimized) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up chat history listeners for user:', currentUser.uid);

    const sentQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const receivedQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const chatMap = new Map<string, ChatHistoryItem>();

    const processMessage = async (messageDoc: any, isSent: boolean) => {
      const messageData = messageDoc.data();
      const otherUserId = isSent ? messageData.receiverId : messageData.senderId;
      const chatId = [currentUser.uid, otherUserId].sort().join('_');

      let chatEntry = chatMap.get(chatId);

      if (!chatEntry) {
        const userDoc = await getDoc(doc(db, 'accounts', otherUserId));
        const userData = userDoc.data();

        if (userData) {
          chatEntry = {
            chatId,
            recipientId: otherUserId,
            recipientName: userData.username || 'User',
            recipientPhoto: userData.profilePicUrl || '',
            lastMessage: messageData.content,
            timestamp: messageData.timestamp,
            unreadCount: (!isSent && !messageData.isRead) ? 1 : 0
          };
        }
      } else {
        if (!messageData.timestamp || !chatEntry.timestamp || 
            messageData.timestamp > chatEntry.timestamp) {
          chatEntry.lastMessage = messageData.content;
          chatEntry.timestamp = messageData.timestamp;
          
          if (!isSent && !messageData.isRead) {
            chatEntry.unreadCount = (chatEntry.unreadCount || 0) + 1;
          } else if (isSent || messageData.isRead) {
            chatEntry.unreadCount = 0;
          }
        }
      }

      if (chatEntry) {
        if (activeChat?.chatId === chatId) {
          chatEntry.unreadCount = 0;
        }
        chatMap.set(chatId, chatEntry);
        updateChats();
      }
    };

    const updateChats = () => {
      const sortedChats = Array.from(chatMap.values()).sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setChats(sortedChats);
    };

    const unsubscribeSent = onSnapshot(sentQuery, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          await processMessage(change.doc, true);
        }
      }
    });

    const unsubscribeReceived = onSnapshot(receivedQuery, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          await processMessage(change.doc, false);
        }
      }
    });

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [currentUser, activeChat]);

  const handleChatClick = async (chatId: string) => {
    if (!currentUser) return;

    const chat = chats.find(c => c.chatId === chatId);
    if (chat) {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', chat.recipientId),
        where('receiverId', '==', currentUser.uid),
        where('isRead', '==', false)
      );

      try {
        const snapshot = await getDocs(messagesQuery);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
        
        const updatedChats = chats.map(c => 
          c.chatId === chatId ? { ...c, unreadCount: 0 } : c
        );
        setChats(updatedChats);
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }

      setActiveChat(chat);
      setIsOpen(false);
      setIsChatModalMinimized(false); 
    }
  };

  const handleCloseChat = () => {
    setActiveChat(null);
    setIsChatModalMinimized(false);
  };

  const handleHistoryButtonClick = () => {
    if (activeChat && !isChatModalMinimized) {
      setIsChatModalMinimized(true);
    }
    setIsOpen(!isOpen);
  };

  if (!currentUser) return null;

  return (
    <>
      <button 
        className="chat-history-button"
        onClick={handleHistoryButtonClick}
      >
        <img src={chatIcon} alt="Chat" className="chat-icon" />
        {chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0) > 0 && (
          <span className="unread-badge">
            {chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="chat-history-modal">
          <div className="chat-history-header">
            <h2>Chat History</h2>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="chat-history-content">
            {chats.length === 0 ? (
              <div className="no-chats">No chat history yet</div>
            ) : (
              chats.map((chat) => (
                <div 
                  key={chat.chatId}
                  className={`chat-history-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => handleChatClick(chat.chatId)}
                >
                  <img 
                    src={chat.recipientPhoto || '/default-avatar.png'} 
                    alt={chat.recipientName} 
                    className="chat-history-avatar"
                  />
                  <div className="chat-history-info">
                    <div className="chat-history-name">{chat.recipientName}</div>
                    <div className="chat-history-message">{chat.lastMessage}</div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="chat-history-badge">{chat.unreadCount}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeChat && (
        <ChatModal
          isOpen={true}
          onClose={handleCloseChat}
          recipientId={activeChat.recipientId}
          recipientName={activeChat.recipientName}
          recipientPhoto={activeChat.recipientPhoto}
          isMinimized={isChatModalMinimized}
          onMinimizedChange={handleChatModalStateChange}
        />
      )}
    </>
  );
};

export default ChatHistory;
