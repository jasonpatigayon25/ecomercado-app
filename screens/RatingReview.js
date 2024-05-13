import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Rating } from 'react-native-ratings';
import Icon from 'react-native-vector-icons/FontAwesome';

const RatingReview = ({ route, navigation }) => {
  const { prodId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      const reviewsRef = collection(db, 'productRatings');
      const q = query(reviewsRef, where('prodId', '==', prodId));

      const querySnapshot = await getDocs(q);
      if (querySnapshot.docs.length === 0) {
        setReviews([]); // No reviews fetched
        setReviewCount(0);
        setAverageRating(0);
      } else {
        const fetchedReviews = [];
        let totalRating = 0;
        for (const doc of querySnapshot.docs) {
          let data = doc.data();
          let ratedAtFormatted = data.ratedAt ? data.ratedAt.toDate().toLocaleDateString('en-US') : 'N/A';
          const userRef = collection(db, 'users');
          const userQuery = query(userRef, where('email', '==', data.ratedBy));
          const userSnapshot = await getDocs(userQuery);
          const userData = userSnapshot.docs[0]?.data() || {};
          fetchedReviews.push({
            ...data,
            id: doc.id,
            fullName: `${userData.firstName || ''} ${userData.lastName || ''}`,
            photoUrl: userData.photoUrl,
            ratedAt: ratedAtFormatted,
          });
          totalRating += Number(data.rating);
        }
        setReviews(fetchedReviews);
        setReviewCount(querySnapshot.docs.length);
        setAverageRating(totalRating / querySnapshot.docs.length);
      }
    };

    fetchReviews();
  }, [prodId]);

  const renderItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.userIcon} />
        ) : (
          <Icon name="user-circle" size={40} color="#CCCCCC" style={styles.userIcon} />
        )}
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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Reviews</Text>
      </View>
      <View style={styles.overallRating}>
        <Text style={styles.overallRatingText}>Overall Rating</Text>
        {reviewCount > 0 ? (
          <>
            <Text style={styles.overallRatingValue}>{averageRating.toFixed(1)}</Text>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={20}
              readonly
              startingValue={averageRating}
              style={styles.ratingAverage}
            />
            <Text style={styles.ratingInfo}>Based on {reviewCount} reviews</Text>
          </>
        ) : (
          <Text style={styles.noReviews}>No reviews yet for this product.</Text>
        )}
      </View>
      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 16,
    color: '#333',
  },
  overallRating: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  overallRatingText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  overallRatingValue: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  ratingInfo: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  reviewCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewHeaderDetails: {
    marginLeft: 12,
    flexShrink: 1, 
  },
  fullName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  date: {
    fontSize: 14,
    color: '#888',
  },
  rating: {
    alignSelf: 'flex-start',
    marginVertical: 8, 
  },
  rating: {
    alignSelf: 'center',
    marginVertical: 8, 
    backgroundColor: '#ccc'
  },
  comment: {
    fontSize: 14,
    color: 'grey',
    marginTop: 4, 
  },
  userIcon: {
    width: 40, 
    height: 40,
    borderRadius: 20, 
    backgroundColor: '#f0f0f0',  
    marginRight: 8,
  },
  helpfulCount: {
    fontSize: 14,
    color: '#05652D',
    marginTop: 4,
  },
  noReviews: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export default RatingReview;
