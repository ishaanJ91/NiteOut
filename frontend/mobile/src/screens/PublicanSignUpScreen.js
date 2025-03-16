import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet,
    Keyboard,
    ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SvgXml } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../firebaseConfig";
import {
    collection,
    doc,
    setDoc,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { checkmarkXml } from "../utils/checkmark";
import { uploadXml } from "../utils/upload";
import { infoIconXml } from "../utils/infoIcon";
import BerPicker, { getColorForRating } from "../components/BerPicker";
import BerDescription from "../components/BerDescription";
import config from "../config.json";

const PublicanSignUpScreen = ({ navigation }) => {
    const [pubName, setPubName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [pubAddress, setPubAddress] = useState("");
    const [pubEircode, setPubEircode] = useState("");
    const [password, setPassword] = useState("");
    const [pubThumbnail, setPubThumbnail] = useState(null);
    const [berCertificate, setBerCertificate] = useState(null);
    const [selectedBerRating, setSelectedBerRating] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    // Error states
    const [pubNameError, setPubNameError] = useState("");
    const [phoneNumberError, setPhoneNumberError] = useState("");
    const [pubAddressError, setPubAddressError] = useState("");
    const [pubEircodeError, setPubEircodeError] = useState("");
    const [berRatingError, setBerRatingError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const storedPubName = await AsyncStorage.getItem("pubName");
                const storedPhone = await AsyncStorage.getItem("phoneNumber");
                const storedAddress = await AsyncStorage.getItem("pubAddress");
                const storedEircode = await AsyncStorage.getItem("pubEircode");

                if (storedPubName) setPubName(storedPubName);
                if (storedPhone) setPhoneNumber(storedPhone);
                if (storedAddress) setPubAddress(storedAddress);
                if (storedEircode) setPubEircode(storedEircode);
            } catch (error) {
                console.error("Error loading stored data:", error);
            }
        };

        loadStoredData();
    }, []);

    const handleImagePicker = async (setImageState) => {
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert("Permission to access media library is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaType: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
        });

        if (!result.canceled) {
            setImageState(result.assets[0]);
        }
    };

    const checkPubExists = async (pubName) => {
        const pubsRef = collection(db, "pubs");
        const q = query(pubsRef, where("pubName", "==", pubName));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty; // Returns true if pub already exists
    };

    const fetchCoordinates = async (eircode) => {
        try {
            const response = await fetch(
                `https://api.opencagedata.com/geocode/v1/json?q=${eircode}&key=${config.GEOCODING_API_KEY}`
            );
            const data = await response.json();

            if (data.results.length > 0) {
                const { lat, lng } = data.results[0].geometry;
                console.log(`Latitude: ${lat}, Longitude: ${lng}`);
                return { xcoord: lat, ycoord: lng };
            } else {
                throw new Error("Invalid Eircode. No coordinates found.");
            }
        } catch (error) {
            console.error("❌ Error fetching coordinates:", error);
            return null;
        }
    };

    const handlePublicanSignUp = async () => {
        console.log("SignUp Clicked");

        // Reset any existing error states
        setPubNameError("");
        setPhoneNumberError("");
        setPubAddressError("");
        setPubEircodeError("");
        setBerRatingError("");
        setEmailError("");
        setPasswordError("");

        // Validate Input Fields
        if (
            !pubName ||
            !phoneNumber ||
            !pubAddress ||
            !pubEircode ||
            !selectedBerRating
        ) {
            Alert.alert(
                "Missing Information",
                "Please fill in all fields before signing up."
            );
            return;
        }

        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setPasswordError("Password is required.");
            return;
        }

        try {
            // Check if pub already exists
            const pubExists = await checkPubExists(pubName);
            if (pubExists) {
                Alert.alert(
                    "Duplicate Pub",
                    "A pub with this name already exists. Choose another name."
                );
                return;
            }

            // Create Firebase Auth user (publican account)
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            const user = userCredential.user;

            // Set display name to the pub name for the publican account
            await updateProfile(user, { displayName: pubName });

            console.log("Publican account created:", user);

            // Get coordinates for the pub
            const coords = await fetchCoordinates(pubEircode);
            if (!coords) {
                Alert.alert(
                    "Invalid Eircode",
                    "Could not fetch coordinates. Please check your Eircode."
                );
                return;
            }

            // Save new publican details to Firestore
            const pubData = {
                pubName,
                phoneNumber,
                pubAddress,
                pubEircode,
                berRating: selectedBerRating,
                pubThumbnail: pubThumbnail ? pubThumbnail.uri : null,
                berCertificate: berCertificate ? berCertificate.uri : null,
                xcoord: coords.xcoord,
                ycoord: coords.ycoord,
                email,
                password,
            };

            // Save the pub details in Firestore
            await setDoc(doc(db, "pubs", pubName), pubData);
            console.log("✅ Publican details saved to Firestore");

            // Store user details in AsyncStorage
            await AsyncStorage.setItem("pubName", pubName);
            await AsyncStorage.setItem("phoneNumber", phoneNumber);
            await AsyncStorage.setItem("pubAddress", pubAddress);
            await AsyncStorage.setItem("pubEircode", pubEircode);
            await AsyncStorage.setItem("xcoord", JSON.stringify(coords.xcoord));
            await AsyncStorage.setItem("ycoord", JSON.stringify(coords.ycoord));
            console.log("✅ Publican details saved to AsyncStorage");

            // Success: navigate to Home page or another screen
            Alert.alert("Success", "Your pub has been registered!");
            navigation.navigate("Home");
        } catch (error) {
            console.error("❌ Error signing up publican:", error);

            // Handle errors appropriately
            if (error.code === "auth/email-already-in-use") {
                setEmailError(
                    "Email is already in use. Please try another one."
                );
            } else if (error.code === "auth/weak-password") {
                setPasswordError("Password is too weak! Try a stronger one.");
            } else if (error.code === "auth/invalid-email") {
                setEmailError("Invalid email format.");
            } else {
                Alert.alert("Error", "Something went wrong. Please try again.");
            }
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <View style={[styles.section, styles.backgroundBlue]} />
                <View style={[styles.section, styles.backgroundLightBlue]} />
                <View style={[styles.section, styles.backgroundWhite]} />
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>
                        List your pub, start now!
                    </Text>
                </View>
                {/* Scrollable Form Container */}
                <ScrollView
                    contentContainerStyle={styles.formContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Pub Name Error */}
                    <View style={{ minHeight: 17 }}>
                        {pubNameError ? (
                            <Text style={styles.errorText}>{pubNameError}</Text>
                        ) : null}
                    </View>

                    {/* Pub Name Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Pub Name"
                        placeholderTextColor="#999"
                        value={pubName}
                        onChangeText={setPubName}
                    />

                    {/* Phone Number Error */}
                    <View style={{ minHeight: 17 }}>
                        {phoneNumberError ? (
                            <Text style={styles.errorText}>
                                {phoneNumberError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Phone Number Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />

                    {/* Email Error */}
                    <View style={{ minHeight: 17 }}>
                        {emailError ? (
                            <Text style={styles.errorText}>{emailError}</Text>
                        ) : null}
                    </View>

                    {/* Email Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />

                    {/* Pub Address Error */}
                    <View style={{ minHeight: 17 }}>
                        {pubAddressError ? (
                            <Text style={styles.errorText}>
                                {pubAddressError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Pub Address Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Pub Address"
                        placeholderTextColor="#999"
                        value={pubAddress}
                        onChangeText={setPubAddress}
                    />

                    {/* Pub Eircode Error */}
                    <View style={{ minHeight: 17 }}>
                        {pubEircodeError ? (
                            <Text style={styles.errorText}>
                                {pubEircodeError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Pub Eircode Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Pub Eircode"
                        placeholderTextColor="#999"
                        value={pubEircode}
                        onChangeText={setPubEircode}
                    />

                    {/* Password Error */}
                    <View style={{ minHeight: 17 }}>
                        {passwordError ? (
                            <Text
                                style={
                                    passwordError.includes("required")
                                        ? styles.errorText
                                        : styles.weakPasswordText
                                }
                            >
                                {passwordError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Password Input */}
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#999"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    {/* BER Rating Input */}
                    <View>
                        <TouchableOpacity
                            style={[
                                styles.uploadButton,
                                {
                                    backgroundColor: "#eef0f2",
                                    position: "relative",
                                },
                            ]}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text
                                style={[
                                    styles.uploadButtonText,
                                    {
                                        color: selectedBerRating
                                            ? getColorForRating(
                                                  selectedBerRating
                                              )
                                            : "#999",
                                        fontWeight: selectedBerRating
                                            ? "bold"
                                            : "normal",
                                    },
                                ]}
                            >
                                {selectedBerRating || "Select BER Rating"}
                            </Text>

                            {/* Info Icon for BER inside the button with its own TouchableOpacity */}
                            <TouchableOpacity
                                onPress={() => setInfoModalVisible(true)} // Handle the icon press
                                style={{
                                    position: "absolute",
                                    right: "5%",
                                }}
                            >
                                <SvgXml
                                    xml={infoIconXml}
                                    width={25}
                                    height={25}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>

                    {/* BER Upload Certificate */}
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => handleImagePicker(setBerCertificate)}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <SvgXml
                                xml={berCertificate ? checkmarkXml : uploadXml}
                                width={30}
                                height={30}
                                style={{ marginRight: 10 }}
                            />
                            <Text style={[styles.uploadButtonText]}>
                                {berCertificate
                                    ? "Uploaded BER Certificate"
                                    : "Upload BER Certificate"}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Pub Thumbnail Upload */}
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => handleImagePicker(setPubThumbnail)}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <SvgXml
                                xml={pubThumbnail ? checkmarkXml : uploadXml}
                                width={30}
                                height={30}
                                style={{ marginRight: 10 }}
                            />
                            <Text style={[styles.uploadButtonText]}>
                                {pubThumbnail
                                    ? "Uploaded Pub Thumbnail"
                                    : "Upload Pub Thumbnail"}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Sign Up as Publican Button */}
                    <TouchableOpacity
                        style={styles.publicanButton}
                        onPress={handlePublicanSignUp}
                    >
                        <Text style={styles.publicanText}>
                            Sign up as Publican
                        </Text>
                    </TouchableOpacity>

                    {/* Footer Container */}
                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>
                            Already have an account?{" "}
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Login")}
                        >
                            <Text style={styles.signInLink}>Log in</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* BER Picker Modal */}
                <BerPicker
                    visible={modalVisible}
                    selectedValue={selectedBerRating}
                    onValueChange={(itemValue) =>
                        setSelectedBerRating(itemValue)
                    }
                    onClose={() => setModalVisible(false)}
                />

                {/* BER Description Modal */}
                <BerDescription
                    visible={infoModalVisible}
                    onClose={() => setInfoModalVisible(false)}
                />
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#00B4D8",
    },
    section: {
        position: "absolute",
        left: 0,
        right: 0,
    },
    backgroundBlue: {
        height: "100%",
        top: 0,
        backgroundColor: "#00B4D8",
    },
    backgroundLightBlue: {
        height: "100%",
        top: "2%",
        borderTopLeftRadius: 42,
        borderTopRightRadius: 42,
        backgroundColor: "#90E0EF",
    },
    backgroundWhite: {
        height: "100%",
        top: "19%",
        borderTopLeftRadius: 42,
        borderTopRightRadius: 42,
        backgroundColor: "#f8f9fa",
    },
    formContainer: {
        margin: 10,
        padding: 20,
        borderRadius: 15,
        elevation: 3,
        top: "4%",
    },
    title: {
        fontSize: 28,
        color: "#212529",
        fontWeight: "bold",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#212529",
        fontWeight: "light",
        textAlign: "center",
        marginBottom: "10%",
    },
    input: {
        height: 55,
        backgroundColor: "#eef0f2",
        borderRadius: 13,
        paddingHorizontal: 15,
        marginBottom: 25,
    },
    uploadButton: {
        height: 55,
        backgroundColor: "#FBDBE9",
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 13,
        justifyContent: "center",
        marginBottom: 25,
    },
    uploadButtonText: {
        color: "#FF006E",
        fontWeight: "bold",
    },
    uploadedText: {
        color: "#4CAF50",
        textAlign: "center",
        marginTop: 5,
    },
    publicanButton: {
        backgroundColor: "#FF007A",
        paddingVertical: 20,
        borderRadius: 15,
        alignItems: "center",
        marginTop: "7%",
    },
    publicanText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 15,
    },
    footerText: {
        color: "#666",
        fontSize: 14,
    },
    signInLink: {
        color: "#FF007A",
        fontWeight: "bold",
        fontSize: 14,
    },
});

export default PublicanSignUpScreen;
