import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, Image } from 'react-native';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import { writeBatch } from 'firebase/firestore';
import { Rating } from 'react-native-ratings';
import { ActivityIndicator } from 'react-native';

const Chatbox = ({ navigation }) => {
  const [chatSummaries, setChatSummaries] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [userRating, setUserRating] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const getInitials = (name) => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.toUpperCase();
  };

  const handleSearch = async (text) => {
    const searchText = text.toLowerCase();
    setSearchQuery(searchText);
    
    if (searchText.trim() === '') {
      setSearchResults([]);
      return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email.toLowerCase().includes(searchText)) {
          users.push(userData);
        }
      });
      setSearchResults(users);
    } else {
      console.error("No users found for the search query:", searchText);
    }
}

  const handleLongPress = (chat) => {
    setSelectedChat(chat);
    setOptionModalVisible(true);
  };

  const handleUserSelect = async (selectedEmail, chatId) => {
    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      const chatData = chatDocSnap.data();
  
      const currentUser = auth.currentUser;

      const updatedMessageStatus = { ...chatData.messageStatus };
      delete updatedMessageStatus[currentUser.email];
  
      await updateDoc(chatDocRef, {
        messageStatus: updatedMessageStatus,
        status: 'read',
      });
    } catch (error) {
      console.error('Error updating messageStatus:', error);
    }
  
    navigation.navigate('Chat', {
      chatId: chatId,
      receiverEmail: selectedEmail,
    });
  };
  
  const fetchUserDetailsByEmail = async (email) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0].data();
      return {
        firstName: userDoc.firstName,
        lastName: userDoc.lastName,
        photoUrl: userDoc.photoUrl || null 
      };
    } else {
      return { firstName: 'Unknown', lastName: 'User', photoUrl: null };
    }
  };
  
  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      const chatsRef = collection(db, 'chats');
      const unsubscribeChats = onSnapshot(chatsRef, async (querySnapshot) => {
        const allChats = [];
        querySnapshot.forEach((doc) => {
          if (doc.data().users.includes(currentUser.email)) {
            allChats.push({
              ...doc.data(),
              chatId: doc.id,
            });
          }
        });

        const currentUserDetails = await fetchUserDetailsByEmail(currentUser.email);
  
        Promise.all(allChats.map(async (chat) => {
          const messagesRef = collection(db, 'messages');
          const q = query(messagesRef, where('chatId', '==', chat.chatId), orderBy('timestamp', 'desc'), limit(1));
          const messagesSnapshot = await getDocs(q);
          let lastMessageData = messagesSnapshot.docs[0]?.data();
          let lastMessageText = lastMessageData?.imageUrl ? 'Photo attached' : lastMessageData?.text || 'No messages yet';
          let lastMessageTimestamp = lastMessageData?.timestamp ? new Date(lastMessageData.timestamp.seconds * 1000) : new Date(0);
  
          const otherParticipantEmail = chat.users.find(email => email !== currentUser.email);
          const otherUserDetails = await fetchUserDetailsByEmail(otherParticipantEmail);

          let otherParticipantName = otherUserDetails
            ? `${otherUserDetails.firstName} ${otherUserDetails.lastName}`
            : 'Unknown User';
  
          return {
            chatId: chat.chatId,
            otherParticipantEmail,
            otherParticipantName,
            otherParticipantPhotoUrl: otherUserDetails ? otherUserDetails.photoUrl : null,
            currentUserFirstName: currentUserDetails?.firstName || 'Current',
            currentUserLastName: currentUserDetails?.lastName || 'User',
            lastMessage: lastMessageText,
            timestamp: lastMessageTimestamp,
          };
        })).then(chatSummaries => {
          chatSummaries.sort((a, b) => b.timestamp - a.timestamp);
          setChatSummaries(chatSummaries);
          setIsLoading(false);
        });
      });
  
      return () => unsubscribeChats();
    }
  }, [currentUser]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemContainer, styles.itemShadow]}
      onPress={() => handleUserSelect(item.otherParticipantEmail, item.chatId)}
      onLongPress={() => handleLongPress(item)} 
    >
    <View style={[styles.avatarContainer, styles.itemShadow]}>
      {item.otherParticipantPhotoUrl ? (
        <Image
          source={{ uri: item.otherParticipantPhotoUrl }}
          style={styles.avatarImage}
        />
      ) : (
        <Text style={styles.avatarInitials}>{getInitials(item.otherParticipantName)}</Text>
      )}
    </View>
      <View style={styles.textAndTimestampContainer}>
        <Text style={styles.emailText}>{item.otherParticipantName}</Text>
        <Text style={styles.lastMessageText} numberOfLines={1} ellipsizeMode="tail">{item.lastMessage}</Text>
        <Text style={styles.timestampText}>
          {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
  

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="comments" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No Conversation Yet</Text>
    </View>
  );

  const handleDeleteConversation = async () => {
    if (selectedChat) {
      const chatId = selectedChat.chatId;
      setConfirmDeleteModalVisible(true);
    }
  };
  
  const confirmDelete = async () => {
    if (selectedChat) {
      const chatId = selectedChat.chatId;
      
      const batch = writeBatch(db);
  
      const chatRef = doc(db, 'chats', chatId);
      batch.delete(chatRef);
  
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('chatId', '==', chatId));
      const messagesSnapshot = await getDocs(q);
  
      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
  
      try {
        await batch.commit();
        setOptionModalVisible(false);
        setConfirmDeleteModalVisible(false);
  
        setChatSummaries(prevChatSummaries =>
          prevChatSummaries.filter(chat => chat.chatId !== chatId)
        );
      } catch (error) {
        console.error('Error deleting conversation and messages:', error);
      }
    }
  };


  return (
    <View style={styles.container}>
      {isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#05652D" />
        <Text>Loading chats...</Text>
      </View>
    ) : (
      <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat List</Text>
      </View>

      {/* <TouchableOpacity
        onPress={() => setSearchModalVisible(true)}
        style={styles.searchBar}
      >
        <Icon name="search" size={20} color="#666" />
        <Text style={styles.searchPlaceholderText}> Search for a user...</Text>
      </TouchableOpacity> */}

      <FlatList
        data={chatSummaries}
        renderItem={renderItem}
        keyExtractor={(item) => item.chatId}
        ListEmptyComponent={renderEmptyComponent}
      />

      
      <Modal
        animationType="slide"
        transparent={true}
        visible={optionModalVisible}
        onRequestClose={() => setOptionModalVisible(false)}
      >
        <View style={styles.centeredModalView}>
          <View style={styles.optionModalView}>
            <Text style={styles.modalHeaderText}>Options</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleDeleteConversation}
            >
              <Icon name="trash" size={20} color="#FF0000" />
              <Text style={styles.modalOptionText}>Delete Conversation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => setOptionModalVisible(false)}
            >
              <Icon name="times" size={20} color="#000" />
              <Text style={styles.modalOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmDeleteModalVisible}
        onRequestClose={() => setConfirmDeleteModalVisible(false)}
      >
        <View style={styles.centeredModalView}>
          <View style={styles.confirmDeleteModalView}>
            <Text style={styles.modalHeaderText}>Confirm Deletion</Text>
            <Text style={styles.confirmDeleteText}>
              Are you sure you want to delete this conversation?
            </Text>
            <View style={styles.confirmDeleteButtons}>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setConfirmDeleteModalVisible(false)}
              >
                <Text style={styles.cancelDeleteButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
    )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // marginTop: 30,
    backgroundColor: '#E3FCE9',
  },
  header: {
    paddingTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05652D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  searchPlaceholderText: {
    marginLeft: 10,
    color: '#666',
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 10,
  },
  itemShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#DCF8C6',
  },
  textAndTimestampContainer: {
    flex: 1,
    marginLeft: 10,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessageText: {
    fontSize: 14,
    color: '#666',
    marginRight: 50,
  },
  timestampText: {
    fontSize: 10,
    color: '#999',
    position: 'absolute',
    right: 3,
    top: -8,
  },
  textContainer: {
    marginLeft: 10,
  },
  centeredModalView: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    paddingTop: 20, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTextInput: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    width: '100%',
    marginBottom: 15,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 10,
  },
  optionModalView: {
    width: '100%',
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'absolute', 
    bottom: 0, 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  confirmDeleteModalView: {
    width: '100%',
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmDeleteText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  confirmDeleteButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmDeleteButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  cancelDeleteButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelDeleteButtonText: {
    color: '#333',
    fontSize: 16,
  },
  ratingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  ratingModalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  ratingInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    width: '100%',
    padding: 10,
    marginBottom: 20,
  },
  ratingMessageInput: {
    width: '100%',
    height: 100,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f2f2f2',
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  ratingSubmitButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: "#05652D",
  },
  ratingCancelButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: "#cccccc",
    marginTop: 10,
  },
  buttonTextStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30, 
  },
  avatarInitials: {
    fontSize: 24,
    color: '#05652D',
    fontWeight: 'bold',
    alignSelf: 'center',
    lineHeight: 60, 
  },  
});

export default Chatbox;