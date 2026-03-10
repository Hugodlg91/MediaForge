import React, { Component, ErrorInfo } from "react";
import i18next from "i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: "" };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error?.message ?? "" };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[GlobalErrorBoundary] Uncaught error:", error, info.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        // Use i18next directly (not the hook) because we are in a class component
        const t = (key: string) => i18next.t(key) as string;

        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    gap: "16px",
                    padding: "32px",
                    background: "#0a0a0f",
                    color: "#e5e7eb",
                    fontFamily: "system-ui, sans-serif",
                    textAlign: "center",
                }}
            >
                {/* Icon */}
                <div style={{ fontSize: "3rem" }}>⚠️</div>

                {/* Title */}
                <h1
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: "#ffffff",
                        margin: 0,
                    }}
                >
                    {t("errorBoundary.title")}
                </h1>

                {/* Description */}
                <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: "400px", margin: 0 }}>
                    {t("errorBoundary.description")}
                </p>

                {/* Error detail (dev aid) */}
                {this.state.errorMessage && (
                    <pre
                        style={{
                            fontSize: "0.75rem",
                            color: "#ef4444",
                            background: "#1f1f2e",
                            padding: "10px 16px",
                            borderRadius: "8px",
                            maxWidth: "500px",
                            overflowX: "auto",
                            textAlign: "left",
                            margin: 0,
                        }}
                    >
                        {this.state.errorMessage}
                    </pre>
                )}

                {/* Reload button */}
                <button
                    onClick={this.handleReload}
                    style={{
                        marginTop: "8px",
                        padding: "10px 24px",
                        background: "#6366f1",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    🔄 {t("errorBoundary.reload")}
                </button>

                {/* Footer */}
                <p style={{ fontSize: "0.75rem", color: "#4b5563", margin: 0 }}>
                    {t("errorBoundary.report")}
                </p>
            </div>
        );
    }
}
