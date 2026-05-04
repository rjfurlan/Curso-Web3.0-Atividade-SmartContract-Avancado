import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ display: "flex", gap: "10px" }}>
      <Link to="/"      >Mercado de TELs</Link>
      <Link to="/create">Criar Jobs</Link>
      <Link to="/jobs"  >Meus Jobs</Link>
      <Link to="/open"  >Jobs Abertos</Link>
      <Link to="/dao"   >Disputas</Link>
    </nav>
  );
}
