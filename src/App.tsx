import "./App.css";

import { LoginScreen } from "./components/login/LoginScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { HomePage } from "./pages/HomePage";
import { RedditStoryPage } from "./pages/RedditStoryPage";
import { useRouter } from "./state/router";

function App() {
  const route = useRouter((state) => state.route);

  return (
    <div className="flex w-full h-full absolute inset-0 overflow-hidden">
      <LoginScreen />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-none">
        {route === 'home' && <HomePage />}
        {route === 'reddit-story' && <RedditStoryPage />}
      </main>
    </div>
  );
}

export default App;
