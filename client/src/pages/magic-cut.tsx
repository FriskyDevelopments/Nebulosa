/**
 * Magic Cut — Main Dashboard / Home
 *
 * Entry point that lets users navigate to catalog, cut flow, or submission flow.
 */

import { useState } from "react";
import CutFlowPage from "./cut-flow";
import SubmitMaskPage from "./submit-mask";
import CatalogPage from "./catalog";

type View = "home" | "catalog" | "cut" | "submit";

type MagicCutDashboardProps = {
  userId: number;
};

export default function MagicCutDashboard({ userId }: MagicCutDashboardProps) {
  const [view, setView] = useState<View>("home");

  return (
    <div className="magic-cut-app">
      {/* Nav */}
      <nav className="magic-cut-nav">
        <span className="nav-logo">✂️ Magic Cut</span>
        <div className="nav-links">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>Home</button>
          <button className={view === "catalog" ? "active" : ""} onClick={() => setView("catalog")}>Catalog</button>
          <button className={view === "cut" ? "active" : ""} onClick={() => setView("cut")}>Create Sticker</button>
          <button className={view === "submit" ? "active" : ""} onClick={() => setView("submit")}>Submit Mask</button>
        </div>
      </nav>

      <main className="magic-cut-main">
        {view === "home" && (
          <div className="home-screen">
            <h1>✂️ Welcome to Magic Cut</h1>
            <p className="subtitle">Turn any image into a custom sticker with one click.</p>

            <div className="flow-overview">
              <button
                type="button"
                className="flow-card"
                onClick={() => setView("cut")}
              >
                <span className="flow-icon">🖼️</span>
                <h3>Create a Sticker</h3>
                <p>Upload an image, choose a cut style, and generate your sticker.</p>
              </button>
              <button
                type="button"
                className="flow-card"
                onClick={() => setView("catalog")}
              >
                <span className="flow-icon">✂️</span>
                <h3>Browse Catalog</h3>
                <p>Explore all available cut styles and masks.</p>
              </button>
              <button
                type="button"
                className="flow-card"
                onClick={() => setView("submit")}
              >
                <span className="flow-icon">📤</span>
                <h3>Submit a Mask</h3>
                <p>Create and submit your own mask template to the platform.</p>
              </button>
            </div>

            <div className="formula-box">
              <code>IMAGE + MASK + ACCESS RULES = STICKER OUTPUT</code>
            </div>
          </div>
        )}

        {view === "catalog" && (
          <CatalogPage userId={userId} onSelectMask={() => setView("cut")} />
        )}

        {view === "cut" && <CutFlowPage userId={userId} />}

        {view === "submit" && <SubmitMaskPage userId={userId} />}
      </main>
    </div>
  );
}
