import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Rating } from 'react-native-ratings';
import Icon from 'react-native-vector-icons/FontAwesome';

const RatingReview = ({ route }) => {
  const { prodId } = route.params;
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const reviewsRef = collection(db, 'rateItems');
      const q = query(reviewsRef, where('prodId', '==', prodId));

      const querySnapshot = await getDocs(q);
      const fetchedReviews = [];
      querySnapshot.forEach((doc) => {
        let data = doc.data();
        let ratedAtFormatted = data.ratedAt ? data.ratedAt.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : 'N/A'; // Format the date as needed
        fetchedReviews.push({
          ...data,
          id: doc.id,
          ratedAt: ratedAtFormatted,
        });
      });
      setReviews(fetchedReviews);
    };

    fetchReviews();
  }, [prodId]);

  const renderItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Icon name="user-circle" size={24} color="#CCCCCC" style={styles.userIcon} />
        <View style={styles.reviewHeaderDetails}>
          <Text style={styles.fullName}>{item.fullName}</Text>
          <Text style={styles.date}>{item.ratedAt}</Text>
        </View>
      </View>
      <Rating
        type="star"
        ratingCount={5}
        imageSize={20}
        readonly
        startingValue={Number(item.rating)}
        style={styles.rating}
      />
      <Text style={styles.comment}>{item.comment}</Text>
      {item.helpfulCount && (
        <Text style={styles.helpfulCount}>Helpful ({item.helpfulCount})</Text>
      )}
    </View>
  );

  return (
    <FlatList
      data={reviews}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
};


const styles = StyleSheet.create({
  reviewCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewHeaderDetails: {
    marginLeft: 8,
  },
  fullName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  ratedByText: {
    fontSize: 14,
    color: 'grey',
    marginBottom: 4,
  },
  rating: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  comment: {
    fontSize: 14,
    color: 'grey',
  },
  userIcon: {

  },
  date: {
    fontSize: 14,
    color: 'grey',
  },
  helpfulCount: {
    fontSize: 14,
    color: '#05652D',
    marginTop: 4,
  },
});

export default RatingReview;