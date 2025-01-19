import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import ChatModal from './ChatModal';

interface ChatManagerProps {}

const ChatManager: React.FC<ChatManagerProps> = () => {
  const [activeChats, setActiveChats] = useState<{ [key: string]: boolean }>({});
  const [chatUsers, setChatUsers] = useState<{ [key: string]: { name: string; photo: string } }>({});
  const [isMinimized, setIsMinimized] = useState<{ [key: string]: boolean }>({});
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      doc(db, 'accounts', currentUser.uid),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const chatMates = docSnapshot.data().chatMates || {};
          const updatedActiveChats: { [key: string]: boolean } = {};
          const updatedChatUsers: { [key: string]: { name: string; photo: string } } = {};

          for (const [userId, isActive] of Object.entries(chatMates)) {
            if (isActive) {
              updatedActiveChats[userId] = true;
              
              // Fetch user details if not already in state
              if (!chatUsers[userId]) {
                try {
                  const userDoc = await getDoc(doc(db, 'accounts', userId));
                  if (userDoc.exists()) {
                    updatedChatUsers[userId] = {
                      name: userDoc.data().username || 'Unknown User',
                      photo: userDoc.data().profilePicUrl || '',
                    };
                  }
                } catch (error) {
                  console.error('Error fetching user details:', error);
                }
              }
            }
          }

          setActiveChats(updatedActiveChats);
          setChatUsers(prev => ({ ...prev, ...updatedChatUsers }));
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCloseChat = (userId: string) => {
    setActiveChats(prev => {
      const newActiveChats = { ...prev };
      delete newActiveChats[userId];
      return newActiveChats;
    });
  };

  const handleMinimizedChange = (userId: string, minimized: boolean) => {
    setIsMinimized(prev => ({
      ...prev,
      [userId]: minimized
    }));
  };

  return (
    <div className="chat-manager">
      {Object.entries(activeChats).map(([userId, isActive]) => (
        isActive && chatUsers[userId] && (
          <ChatModal
            key={userId}
            isOpen={true}
            onClose={() => handleCloseChat(userId)}
            recipientId={userId}
            recipientName={chatUsers[userId].name}
            recipientPhoto={chatUsers[userId].photo}
            isMinimized={isMinimized[userId] || false}
            onMinimizedChange={(minimized) => handleMinimizedChange(userId, minimized)}
          />
        )
      ))}
    </div>
  );
};

export default ChatManager;