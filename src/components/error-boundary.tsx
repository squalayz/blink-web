"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: string; }

const C = {
  bg: "#0a0a0a", card: "#141414", border: "#222",
  text: "#fafafa", muted: "#a1a1aa", red: "#ef4444", violet: "#8b5cf6",
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console (production: send to monitoring service)
    console.error("[MishMesh ErrorBoundary]", error, info?.componentStack);

    this.setState({ errorInfo: info?.componentStack || "" });

    // Production: send to error tracking
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      try {
        fetch("/api/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack?.slice(0, 2000),
            componentStack: info?.componentStack?.slice(0, 1000),
            url: window.location.href,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      } catch {}
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: "60vh", display: "flex", alignItems: "center",
          justifyContent: "center", padding: 24, fontFamily: "'Outfit',sans-serif",
        }}>
          <div style={{
            maxWidth: 420, width: "100%", textAlign: "center",
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 32,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 20 }}>
              An unexpected error occurred. Your data is safe. Try refreshing or click below.
            </p>

            {process.env.NODE_ENV !== "production" && this.state.error && (
              <div style={{
                textAlign: "left", padding: 12, borderRadius: 8,
                background: C.bg, marginBottom: 16,
                maxHeight: 120, overflow: "auto",
                fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                color: C.red, lineHeight: 1.4,
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={this.handleRetry} style={{
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: C.violet, color: "white", fontSize: 14,
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Try Again</button>
              <button onClick={() => window.location.reload()} style={{
                padding: "10px 24px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>Reload Page</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
