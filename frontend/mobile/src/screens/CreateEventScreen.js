import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { SvgXml } from "react-native-svg";

import { db } from "../firebaseConfig";
import { logoXml } from "../utils/logo";

const CreateEventScreen = ({ navigation }) => {
  const [publicanId, setPublicanId] = useState(null);

  useEffect(() => {
    const fetchPublicanId = async () => {
      try {
        const id = await AsyncStorage.getItem("publicanId");
        if (id) {
          setPublicanId(id);
          console.log("Publican ID:", id);
        } else {
          console.warn("No publican ID found in AsyncStorage.");
        }
      } catch (error) {
        console.error("Error fetching publican ID from AsyncStorage:", error);
      }
    };
    fetchPublicanId();
  }, []);

  const [gameType] = useState("Seat Based");
  const [numSeats, setNumSeats] = useState("1");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showExpirePicker, setShowExpirePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(
    new Date(Date.now() + 3600000),
  );
  const [expireDateTime, setExpireDateTime] = useState(
    new Date(Date.now() + 86400000),
  );
  const [loading, setLoading] = useState(false);

  const formatDateTime = (date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const incrementSeats = () => {
    const current = parseInt(numSeats, 10) || 0;
    setNumSeats((current + 1).toString());
  };

  const decrementSeats = () => {
    const current = parseInt(numSeats, 10) || 0;
    if (current > 1) {
      setNumSeats((current - 1).toString());
    }
  };

  const generateAvailableSlots = (start, end, maxSeats) => {
    const slots = {};
    let current = new Date(start);

    while (current < end) {
      let nextHour = new Date(current);
      nextHour.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to 0

      if (current.getMinutes() !== 0) {
        nextHour.setHours(current.getHours() + 1);
      }

      if (nextHour > end) {
        nextHour = end;
      }

      const slotKey = `${nextHour.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}-${new Date(nextHour.getTime() + 3600000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`;

      slots[slotKey] = maxSeats;
      current = new Date(nextHour.getTime() + 3600000); // Move to the next hour
    }

    return slots;
  };

  const handleCreateEvent = async () => {
    if (!numSeats || !startDateTime || !endDateTime || !expireDateTime) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!publicanId) {
      Alert.alert("Error", "Publican ID not found.");
      return;
    }

    if (startDateTime.toDateString() !== endDateTime.toDateString()) {
      Alert.alert("Error", "Start time and end time must be on the same day.");
      return;
    }

    const publicanRef = doc(db, "publicans", publicanId);
    const publicanSnap = await getDoc(publicanRef);

    if (!publicanSnap.exists()) {
      Alert.alert("Error", "Publican details not found.");
      return;
    }

    const publicanData = publicanSnap.data();
    const pubDetails = {
      pub_id: publicanId,
      pub_name: publicanData.pub_name || "Unknown Pub",
      pub_address: publicanData.address || "Address not available",
      xcoord: publicanData.xcoord || "0",
      ycoord: publicanData.ycoord || "0",
    };

    const availableSlots = generateAvailableSlots(
      startDateTime,
      endDateTime,
      parseInt(numSeats, 10),
    );

    const eventData = {
      game_type: gameType,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      expires: expireDateTime.toISOString(),
      pub_id: publicanId,
      pub_details: pubDetails,
      available_slots: availableSlots,
      num_seats: parseInt(numSeats, 10),
    };

    setLoading(true);

    try {
      const eventRef = await addDoc(collection(db, "events"), eventData);
      const eventId = eventRef.id;

      const updatedEvents = publicanData.events
        ? [...publicanData.events, eventId]
        : [eventId];
      await updateDoc(publicanRef, {
        events: updatedEvents,
      });

      Alert.alert("Success", "Event created successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = (gamerId) => {
    console.log("GamerId: ", gamerId);
    if (gamerId) {
      navigation.goBack();
    } else {
      alert("Please log in again.");
      navigation.navigate("Login");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => handleProfilePress(publicanId)}>
            <SvgXml xml={logoXml} width={40} height={40} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerText}>Create Events</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Game Type</Text>
            <View style={styles.input}>
              <Text style={styles.inputText}>{gameType}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Number of Seats</Text>
            <View style={styles.numberPickerContainer}>
              <TouchableOpacity
                style={styles.numberButton}
                onPress={decrementSeats}
              >
                <Text style={styles.numberButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.numberInputContainer}>
                <Text style={styles.numberInputText}>{numSeats}</Text>
              </View>
              <TouchableOpacity
                style={styles.numberButton}
                onPress={incrementSeats}
              >
                <Text style={styles.numberButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDateTime(startDateTime)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={startDateTime}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setStartDateTime(selectedDate);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowStartPicker(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateText}>{formatDateTime(endDateTime)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={endDateTime}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setEndDateTime(selectedDate);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowEndPicker(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Expiration Time</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowExpirePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDateTime(expireDateTime)}
              </Text>
            </TouchableOpacity>
            {showExpirePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={expireDateTime}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setExpireDateTime(selectedDate);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowExpirePicker(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.createEventButton}
          onPress={handleCreateEvent}
          disabled={loading}
        >
          <Text style={styles.createEventButtonText}>
            {loading ? "Creating..." : "Create Event"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    paddingLeft: 10,
    flex: 1,
    color: "#000",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#eef0f2",
    padding: 14,
    borderRadius: 13,
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: "#333",
  },
  dateInput: {
    backgroundColor: "#eef0f2",
    padding: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  numberPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  numberButton: {
    backgroundColor: "#FF007A",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  numberButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  numberInputContainer: {
    backgroundColor: "#eef0f2",
    flex: 1,
    height: 50,
    borderRadius: 13,
    marginHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  numberInputText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  createEventButton: {
    backgroundColor: "#FF007A",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
  },
  createEventButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 16,
    paddingTop: 10,
    backgroundColor: "#00B4D8",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#00B4D8",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButton: {
    marginTop: 10,
    backgroundColor: "#FF007A",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateEventScreen;
