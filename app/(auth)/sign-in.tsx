import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CilokBaradaxLogo } from "../../assets/images/cilok-baradax-logo";
import { useAuthStore } from "../../src/utils/authStore";
import { router } from "expo-router";
import { useSignInMutation } from "../../src/services/queries/(auth)/sign-in.query";
import { ToastSuccess } from "../../src/utils/toast";
import { API_URL_DEV } from "../../constant";
// #fff2de
// #b34219

// color pallate
// #F3E9DC
// #D96F32
// #C75D2C
// #F8B259
// #c75d2c4d
// #f8b359a9 bg

const { width, height } = Dimensions.get("window");

export default function SignIn() {
  const { login } = useAuthStore();

  const { mutate, isPending } = useSignInMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const payload = {
      email,
      password,
    };

    mutate(payload, {
      onSuccess: (response) => {
        login(response.accessToken!, response.user!);
        ToastSuccess(
          `Successfully logged in. Welcome back ${response.user?.name || "Admin"}`,
        );

        router.replace("/(tabs)/dashboard");
      },
    });
  };

  const loading = isPending;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={["#b34219", "#b3421988", "#fff2de"]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <Image
              source={{ uri: CilokBaradaxLogo }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Heading */}
          {/* <Text style={styles.welcomeText}>Cilok Baradax</Text> */}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer]}>
                <Text style={styles.inputIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nama@email.com"
                  placeholderTextColor="#4b5563"
                  value={email}
                  onChangeText={setEmail}
                  // onFocus={() => setFocusedField("email")}
                  // onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={[styles.inputContainer]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor="#4b5563"
                  value={password}
                  onChangeText={setPassword}
                  // onFocus={() => setFocusedField("password")}
                  // onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "🙈" : "👁"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.85}
                style={styles.loginButtonWrapper}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#b34219", "#b34219"]}
                  style={styles.loginButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff2de" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Masuk</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff2de",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },

  // Logo
  logoContainer: {
    alignSelf: "center",
    marginBottom: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
  },

  // Heading
  welcomeText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff2de",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },

  // Form
  form: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#565657",
    letterSpacing: 0.3,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff2de8e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#b342193a",
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#f9fafb",
    fontWeight: "400",
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
    opacity: 0.6,
  },

  // Login Button
  loginButtonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#fff2de",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff2de",
    letterSpacing: 0.3,
  },
});
