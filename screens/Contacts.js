import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const Contacts = ({ navigation }) => {
  const [chatSummaries, setChatSummaries] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [users, setUsers] = useState([]);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const getInitials = (name) => {
    if (!name) return "?"; 
  
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.toUpperCase();
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id, 
        ...doc.data()
      }));
      setUsers(fetchedUsers);
    };

    fetchUsers();
  }, []);

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
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.email.toLowerCase().includes(searchText)) {
        users.push(userData);
      }
    });
    setSearchResults(users);
};

  const handleUserSelect = async (selectedEmail) => {
    setSearchModalVisible(false);
    const existingChat = chatSummaries.find(chat => 
      chat.otherParticipantEmail === selectedEmail
    );

    if (existingChat) {
      navigation.navigate('Chat', { chatId: existingChat.chatId, receiverEmail: selectedEmail });
    } else {
      const newChatRef = collection(db, 'chats');
      const newChat = {
        users: [currentUser.email, selectedEmail],
        messages: [],
      };

      try {
        const docRef = await addDoc(newChatRef, newChat);
        navigation.navigate('Chat', { chatId: docRef.id, receiverEmail: selectedEmail });
      } catch (error) {
        console.error('Error creating a new chat:', error);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      const chatsRef = collection(db, 'chats');
      const unsubscribeChats = onSnapshot(chatsRef, (querySnapshot) => {
        const allChats = [];
        querySnapshot.forEach((doc) => {
          if (doc.data().users.includes(currentUser.email)) {
            allChats.push({
              ...doc.data(),
              chatId: doc.id,
            });
          }
        });
  
        Promise.all(allChats.map(async (chat) => {
          const messagesRef = collection(db, 'messages');
          const q = query(messagesRef, where('chatId', '==', chat.chatId), orderBy('timestamp', 'desc'), limit(1));
          const messagesSnapshot = await getDocs(q);
          if (!messagesSnapshot.empty) {
            const lastMessageData = messagesSnapshot.docs[0]?.data();
            const lastMessageTimestamp = lastMessageData?.timestamp
              ? new Date(lastMessageData.timestamp.seconds * 1000)
              : new Date(0);
  
            let lastMessageText = lastMessageData?.imageUrl ? 'Photo attached' : lastMessageData?.text || '';
  
            return {
              chatId: chat.chatId,
              otherParticipantEmail: chat.users.find(email => email !== currentUser.email),
              lastMessage: lastMessageText,
              timestamp: lastMessageTimestamp,
            };
          } else {
            return {
              chatId: chat.chatId,
              otherParticipantEmail: chat.users.find(email => email !== currentUser.email),
              lastMessage: 'No messages yet',
              timestamp: new Date(0),
            };
          }
        })).then(chatSummaries => {
          chatSummaries.sort((a, b) => b.timestamp - a.timestamp);
          setChatSummaries(chatSummaries);
        });
      });
  
      return () => unsubscribeChats();
    }
  }, [currentUser]);  

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="address-book" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No Contacts Yet</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const userDetails = users.find(user => user.email === item.otherParticipantEmail) || {};
    const fullName = `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim();

    return (
      <TouchableOpacity
        style={[styles.itemContainer, styles.itemShadow]}
        onPress={() => navigation.navigate('Chat', { chatId: item.chatId, receiverEmail: item.otherParticipantEmail })}
      >
        <View style={[styles.avatarContainer, styles.itemShadow]}>
          {userDetails.photoUrl ? (
            <Image
              source={{ uri: userDetails.photoUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.emailText}>{userDetails ? userDetails.email : 'Unknown Email'}</Text>
          <Text style={styles.nameText}>
            {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Unknown User'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#05652D" />
        </TouchableOpacity>
        <Text style={styles.title}>Contacts</Text>
      </View>

      <TouchableOpacity
        onPress={() => setSearchModalVisible(true)}
        style={styles.searchBar}
      >
        <Icon name="search" size={20} color="#666" />
        <Text style={styles.searchPlaceholderText}> Search for a user...</Text>
      </TouchableOpacity>

      <FlatList
        data={chatSummaries}
        renderItem={renderItem}
        keyExtractor={(item) => item.chatId}
        ListEmptyComponent={renderEmptyComponent}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={searchModalVisible}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.centeredModalView}>
          <View style={styles.modalView}>
            <TextInput
              autoFocus
              placeholder="Search by email"
              value={searchQuery}
              onChangeText={handleSearch}
              style={styles.modalTextInput}
            />
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleUserSelect(item.email)}
                >
                  <Text style={styles.searchResultText}>{item.email}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3FCE9',
  },
  header: {
    paddingTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FCE9',
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
    color: '#05652D',
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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 12,
    color: '#999',
    position: 'absolute',
    right: 5,
    top: 0,
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
  avatarInitials: {
    fontSize: 24,
    color: '#05652D',
    fontWeight: 'bold',
    alignSelf: 'center',
    lineHeight: 60, 
  },
});

export default Contacts;