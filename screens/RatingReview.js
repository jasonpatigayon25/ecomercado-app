import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Rating } from 'react-native-ratings';

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
        fetchedReviews.push(doc.data());
      });
      setReviews(fetchedReviews);
    };

    fetchReviews();
  }, [prodId]);

  const renderItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <Text style={styles.fullName}>{item.fullName}</Text>
      <Text style={styles.ratedByText}>{item.ratedBy}</Text>
      <Rating
        type="star"
        ratingCount={5}
        imageSize={20}
        readonly
        startingValue={item.rating}
        style={styles.rating}
      />
      <Text style={styles.comment}>{item.comment}</Text>
    </View>
  );

  return (
    <FlatList
      data={reviews}
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
    />
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
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
});

export default RatingReview;