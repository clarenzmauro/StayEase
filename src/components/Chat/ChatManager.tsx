import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ChatModal from './ChatModal';

const ChatManager = (): JSX.Element => {
  const [activeChats, setActiveChats] = useState<{ [key: string]: boolean }>({});
  const [chatUsers, setChatUsers] = useState<{ [key: string]: { name: string; photo: string } }>({});
  const [isMinimized, setIsMinimized] = useState<{ [key: string]: boolean }>({});
  const currentUser = auth.currentUser;

  // Initialize from sessionStorage and listen for changes
  useEffect(() => {
    // Initial load from sessionStorage
    const loadFromStorage = () => {
      const savedActiveChats = sessionStorage.getItem('activeChats');
      if (savedActiveChats) {
        setActiveChats(JSON.parse(savedActiveChats));
      }
      const savedMinimizedState = sessionStorage.getItem('minimizedChats');
      if (savedMinimizedState) {
        setIsMinimized(JSON.parse(savedMinimizedState));
      }
    };

    // Load initial state
    loadFromStorage();

    // Listen for storage events (when other components update sessionStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeChats') {
        const newActiveChats = e.newValue ? JSON.parse(e.newValue) : {};
        setActiveChats(newActiveChats);
      } else if (e.key === 'minimizedChats') {
        const newMinimizedState = e.newValue ? JSON.parse(e.newValue) : {};
        setIsMinimized(newMinimizedState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Effect to fetch user details for active chats
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserDetails = async () => {
      const updatedChatUsers: { [key: string]: { name: string; photo: string } } = {};

      // Only fetch details for active chats from sessionStorage
      for (const userId of Object.keys(activeChats)) {
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

      if (Object.keys(updatedChatUsers).length > 0) {
        setChatUsers(prev => ({ ...prev, ...updatedChatUsers }));
      }
    };

    fetchUserDetails();
  }, [currentUser, activeChats]);

  const handleCloseChat = async (userId: string) => {
    try {
      // Update Firestore to mark chat as inactive
      if (currentUser) {
        await updateDoc(doc(db, 'accounts', currentUser.uid), {
          [`chatMates.${userId}`]: false
        });
      }

      // Update local state
      setActiveChats(prev => {
        const newActiveChats = { ...prev };
        delete newActiveChats[userId];
        sessionStorage.setItem('activeChats', JSON.stringify(newActiveChats));
        return newActiveChats;
      });

      // Remove user details from state if needed
      setChatUsers(prev => {
        const newChatUsers = { ...prev };
        delete newChatUsers[userId];
        return newChatUsers;
      });
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const handleMinimizedChange = (userId: string, minimized: boolean): void => {
    setIsMinimized(prev => {
      const newState = {
        ...prev,
        [userId]: minimized
      };
      sessionStorage.setItem('minimizedChats', JSON.stringify(newState));
      return newState;
    });
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
            onMinimizedChange={(minimized: boolean) => handleMinimizedChange(userId, minimized)}
          />
        )
      ))}
    </div>
  );
};

export default ChatManager;
