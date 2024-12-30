import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import ChatModal from './ChatModal';
import './ChatManager.css';

interface ChatSession {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  lastMessage: string;
  timestamp: any;
}

const ChatManager: React.FC = () => {
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [openChats, setOpenChats] = useState<string[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Query all chats where the current user is the receiver
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const newChats: ChatSession[] = [];
      
      for (const doc of snapshot.docs) {
        const chatData = doc.data();
        const messages = await getDocs(collection(db, 'chats', doc.id, 'messages'));
        const unreadMessages = messages.docs.filter(msg => {
          const msgData = msg.data();
          return msgData.receiverId === currentUser.uid && !msgData.isRead;
        });

        if (unreadMessages.length > 0) {
          const lastMessage = unreadMessages[unreadMessages.length - 1];
          const senderId = lastMessage.data().senderId;
          
          // Get sender info from accounts collection
          const senderDoc = await getDocs(query(
            collection(db, 'accounts'),
            where('uid', '==', senderId)
          ));

          if (!senderDoc.empty) {
            const senderData = senderDoc.docs[0].data();
            newChats.push({
              id: doc.id,
              senderId,
              senderName: senderData.username,
              senderPhoto: senderData.profilePicUrl,
              lastMessage: lastMessage.data().content,
              timestamp: lastMessage.data().timestamp
            });

            // Automatically open chat with unread messages
            if (!openChats.includes(doc.id)) {
              setOpenChats(prev => [...prev, doc.id]);
            }
          }
        }
      }

      setActiveChats(newChats);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCloseChat = (chatId: string) => {
    setOpenChats(prev => prev.filter(id => id !== chatId));
  };

  return (
    <div className="chat-manager">
      {activeChats.map((chat, index) => (
        openChats.includes(chat.id) && (
          <ChatModal
            key={chat.id}
            isOpen={true}
            onClose={() => handleCloseChat(chat.id)}
            recipientId={chat.senderId}
            recipientName={chat.senderName}
            recipientPhoto={chat.senderPhoto}
            initialPosition={index}
          />
        )
      ))}
    </div>
  );
};

export default ChatManager;
