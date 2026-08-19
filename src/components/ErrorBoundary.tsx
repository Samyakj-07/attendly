import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from "react-native";
import { AlertCircle, RotateCcw } from "lucide-react-native";
import { AppStorage } from "../utils/storage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled Application Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleResetApp = () => {
    Alert.alert(
      "Reset to Blank State?",
      "This will erase all locally stored courses, timetable, and attendance history on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await AppStorage.clearAll();
              this.setState({ hasError: false, error: null, errorInfo: null });
            } catch (e) {
              console.error("Error during app reset:", e);
            }
          },
        },
      ]
    );
  };

  public render() {
    if (this.state.hasError) {
      const bg = "#F8FAFC";
      const cardBg = "#FFFFFF";
      const textPrimary = "#0F172A";
      const textSecondary = "#64748B";
      const cardBorder = "rgba(0, 0, 0, 0.08)";
      const errorBoxBg = "#FEE2E2";
      const errorText = "#991B1B";

      return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.iconCircle}>
                <AlertCircle size={32} color="#EF4444" />
              </View>

              <Text style={[styles.title, { color: textPrimary }]}>Something went wrong</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                An unexpected error occurred while rendering the application. Your attendance data remains safe.
              </Text>

              {this.state.error && (
                <View style={[styles.errorBox, { backgroundColor: errorBoxBg }]}>
                  <Text style={[styles.errorText, { color: errorText }]} numberOfLines={4}>
                    {this.state.error.toString()}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.reloadBtn} activeOpacity={0.8} onPress={this.handleReload}>
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={styles.reloadBtnText}>Reload Application</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetBtn} activeOpacity={0.7} onPress={this.handleResetApp}>
                <Text style={styles.resetBtnText}>Reset to Blank State</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#38BDF8",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  reloadBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  resetBtn: {
    paddingVertical: 10,
  },
  resetBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
});
