import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import CreateHackathon from "../pages/CreateHackathon";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Active Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/hackathons/new" element={<CreateHackathon />} />

        <Route path="*" element={"Not Found"} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
