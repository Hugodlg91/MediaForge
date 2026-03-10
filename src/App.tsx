import { useState } from "react";
import { Sidebar, NavSection } from "./components/Layout/Sidebar";
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
        <div className="flex-1 flex items-center justify-center">
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
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar active={section} onChange={setSection} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
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
