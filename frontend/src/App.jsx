import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar    from "./components/Navbar";

import CreateJob from "./pages/CreateJob";
import DAO       from "./pages/DAO";
import Market    from "./pages/Market";
import MyJobs    from "./pages/MyJobs";
import OpenJobs  from "./pages/OpenJobs";



export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"       element={<Market />}    />
        <Route path="/create" element={<CreateJob />} />
        <Route path="/jobs"   element={<MyJobs />}    />
        <Route path="/open"   element={<OpenJobs />}  />
        <Route path="/dao"    element={<DAO />}       />
      </Routes>
    </BrowserRouter>
  );
}
