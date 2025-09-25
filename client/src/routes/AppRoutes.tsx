import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import CreateHackathon from "../pages/Hackathon/CreateHackathon";
import HackathonDetails from "../pages/Hackathon/HackathonDetails";
import AddChallenge from "../pages/Hackathon/AddChallenge";
import ManageHackathon from "../pages/Hackathon/ManageHackathon";
import WalletGuard from "./WalletGuard";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Active Routes */}
        <Route path="/" element={<Home />} />
        <Route
          path="/hackathons/new"
          element={
            <WalletGuard>
              <CreateHackathon />
            </WalletGuard>
          }
        />
        <Route path="/hackathons/:id" element={<HackathonDetails />} />
        <Route
          path="/hackathons/:id/add-challenge"
          element={
            <WalletGuard>
              <AddChallenge />
            </WalletGuard>
          }
        />
        <Route
          path="/hackathons/:id/manage"
          element={
            <WalletGuard>
              <ManageHackathon />
            </WalletGuard>
          }
        />

        <Route path="*" element={"Not Found"} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
