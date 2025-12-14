import "./App.css";

import { LoginScreen } from "./components/login/LoginScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { HomePage } from "./pages/HomePage";
import { RedditStoryPage } from "./pages/RedditStoryPage";
import { LibraryPage } from "./pages/LibraryPage";
import { useRouter } from "./state/router";
import { AIVideoPage } from "./pages/AIVideoPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  const route = useRouter((state) => state.route);

  return (
    <div className="flex w-full h-full absolute inset-0 overflow-hidden">
      <LoginScreen />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-none">
        {route === 'home' && <HomePage />}
        {route === 'ai-video' && <AIVideoPage />}
        {route === 'reddit-story' && <RedditStoryPage />}
        {route === 'library' && <LibraryPage />}
        {route === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
