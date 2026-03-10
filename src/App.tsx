import { useState } from "react";
import { Sidebar, NavSection } from "./components/Layout/Sidebar";
import { TitleBar } from "./components/Layout/TitleBar";
import { ConverterPage } from "./components/Converter/ConverterPage";
import { HistoryPage } from "./components/History/HistoryPage";
import { SettingsPage } from "./components/Settings/SettingsPage";
import { SettingsProvider, useSettingsContext } from "./context/SettingsContext";

// ─── Inner layout (requires SettingsContext) ──────────────────────────────────

function AppLayout() {
  const [section, setSection] = useState<NavSection>("image");
  const { isLoading } = useSettingsContext();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    switch (section) {
      case "image":    return <ConverterPage type="image" />;
      case "video":    return <ConverterPage type="video" />;
      case "audio":    return <ConverterPage type="audio" />;
      case "history":  return <HistoryPage />;
      case "settings": return <SettingsPage />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)", color: "var(--text)" }}>
      <TitleBar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active={section} onChange={setSection} />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}

export default App;
