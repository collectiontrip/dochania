import { BrowserRouter } from "react-router-dom";

import Layout from "./Layout";
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Layout />
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;