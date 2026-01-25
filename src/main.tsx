import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadData } from "./lib/dataCache";

// Start preloading data immediately
preloadData();

createRoot(document.getElementById("root")!).render(<App />);
