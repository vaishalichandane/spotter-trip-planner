import { useState } from "react";
import axios from "axios";
import TripMap from "./components/TripMap";
import LogSheet from "./components/LogSheet";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: "",
    driver_name: "",
    truck_number: "",
    trailer_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [tripData, setTripData] = useState(null);
  const [error, setError] = useState("");
  const [tripHistory, setTripHistory] = useState(() => {
    const saved = localStorage.getItem("tripHistory");
    return saved ? JSON.parse(saved) : [];
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTripData(null);

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/plan-trip/", {
        ...formData,
      });

      setTripData(res.data);

      const newTrip = {
        id: Date.now(),
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        }),
        from: formData.current_location,
        pickup: formData.pickup_location,
        dropoff: formData.dropoff_location,
        driver: formData.driver_name,
        distance: res.data.trip_summary.total_distance_miles,
        days: res.data.trip_summary.total_days,
        cycle: res.data.trip_summary.cycle_used_total,
      };

      const updatedHistory = [newTrip, ...tripHistory].slice(0, 10);
      setTripHistory(updatedHistory);
      localStorage.setItem("tripHistory", JSON.stringify(updatedHistory));

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "Something went wrong while planning the trip."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatStopType = (type) => {
    if (!type) return "";
    return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="app-container">
      <h1>🚛 Spotter Trip Planner & ELD Log Generator</h1>
      <p className="subtitle">
        Enter trip details to generate route, trip summary, stops, and daily ELD logs.
      </p>

      {/* Form */}
      <div className="form-card">
        <div className="form-section-title">📋 Trip Details</div>
        <form onSubmit={handleSubmit} className="trip-form">
          <div className="form-group">
            <label>📍 Current Location</label>
            <input
              type="text"
              name="current_location"
              value={formData.current_location}
              onChange={handleChange}
              placeholder="e.g. Chicago, IL"
              required
            />
          </div>

          <div className="form-group">
            <label>📦 Pickup Location</label>
            <input
              type="text"
              name="pickup_location"
              value={formData.pickup_location}
              onChange={handleChange}
              placeholder="e.g. Indianapolis, IN"
              required
            />
          </div>

          <div className="form-group">
            <label>🏁 Dropoff Location</label>
            <input
              type="text"
              name="dropoff_location"
              value={formData.dropoff_location}
              onChange={handleChange}
              placeholder="e.g. Dallas, TX"
              required
            />
          </div>

          <div className="form-group">
            <label>⏱️ Current Cycle Used (hours)</label>
            <input
              type="number"
              name="current_cycle_used"
              value={formData.current_cycle_used}
              onChange={handleChange}
              placeholder="e.g. 20"
              required
            />
          </div>

          <div className="form-group">
            <label>🚛 Driver Name</label>
            <input
              type="text"
              name="driver_name"
              value={formData.driver_name}
              onChange={handleChange}
              placeholder="e.g. John Smith"
              required
            />
          </div>

          <div className="form-group">
            <label>🔢 Truck #</label>
            <input
              type="text"
              name="truck_number"
              value={formData.truck_number}
              onChange={handleChange}
              placeholder="e.g. TRK-4821"
              required
            />
          </div>

          <div className="form-group">
            <label>🔢 Trailer #</label>
            <input
              type="text"
              name="trailer_number"
              value={formData.trailer_number}
              onChange={handleChange}
              placeholder="e.g. TRL-9934"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner-wrapper">
                <span className="spinner"></span> Planning Trip...
              </span>
            ) : (
              "🗺️ Generate Trip Plan"
            )}
          </button>
        </form>
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      {/* Empty state */}
      {!tripData && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🗺️</div>
          <h3>No Trip Generated Yet</h3>
          <p>Fill in the form above and click Generate Trip Plan to see your route, stops, and ELD logs.</p>
        </div>
      )}

      {/* Trip History */}
      {tripHistory.length > 0 && (
        <div className="section-card">
          <div className="history-header">
            <h2>🕓 Trip History</h2>
            <button
              className="clear-btn"
              onClick={() => {
                setTripHistory([]);
                localStorage.removeItem("tripHistory");
              }}
            >
              Clear History
            </button>
          </div>
          <div className="stops-list">
            {tripHistory.map((trip) => (
              <div key={trip.id} className="stop-item history-item">
                <div className="history-row">
                  <strong>📅 {trip.date}</strong>
                  <span className="history-badge">{trip.days} day trip</span>
                </div>
                <div className="history-row">
                  <span>🚛 Driver: {trip.driver || "—"}</span>
                  <span>📍 {trip.from} → {trip.pickup} → {trip.dropoff}</span>
                </div>
                <div className="history-row">
                  <span>🛣️ {Number(trip.distance).toFixed(2)} miles</span>
                  <span>⏱️ Cycle Used: {Number(trip.cycle).toFixed(2)} hrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tripData && (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">🛣️</div>
              <h3>Total Distance</h3>
              <p>{Number(tripData.trip_summary.total_distance_miles).toFixed(2)} miles</p>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🕐</div>
              <h3>Estimated Drive Hours</h3>
              <p>{Number(tripData.trip_summary.estimated_drive_hours).toFixed(2)} hrs</p>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📅</div>
              <h3>Total Days</h3>
              <p>{tripData.trip_summary.total_days}</p>
            </div>
            <div className="summary-card">
              <div className="summary-icon">⛽</div>
              <h3>Fuel Stops</h3>
              <p>{tripData.trip_summary.fuel_stops}</p>
            </div>
            <div className="summary-card">
              <div className="summary-icon">☕</div>
              <h3>Rest Breaks</h3>
              <p>{tripData.trip_summary.rest_breaks}</p>
            </div>
            <div className={`summary-card ${Number(tripData.trip_summary.cycle_used_total) >= 70 ? "warning-card" : ""}`}>
              <div className="summary-icon">⏱️</div>
              <h3>Total Cycle Used</h3>
              <p>{Number(tripData.trip_summary.cycle_used_total).toFixed(2)} hrs / 70 hrs</p>
              {Number(tripData.trip_summary.cycle_used_total) >= 60 && Number(tripData.trip_summary.cycle_used_total) < 70 && (
                <p className="warning-text">⚠️ Approaching 70-hour limit</p>
              )}
              {Number(tripData.trip_summary.cycle_used_total) >= 70 && (
                <p className="danger-text">🚨 70-hour cycle limit exceeded!</p>
              )}
            </div>
          </div>

          <div className="section-card">
            <h2>🗺️ Route Map</h2>
            <TripMap coordinates={tripData.route.coordinates} stops={tripData.stops} />
          </div>

          <div className="section-card">
            <h2>📍 Stops & Activities</h2>
            <div className="stops-list">
              {tripData.stops.length === 0 ? (
                <p>No stops generated.</p>
              ) : (
                tripData.stops.map((stop, index) => (
                  <div key={index} className="stop-item">
                    <strong>Day {stop.day}</strong> — {formatStopType(stop.type)} —{" "}
                    {stop.time} — {stop.duration}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section-card">
            <h2>📋 Daily ELD Logs</h2>
            {tripData.daily_logs.map((log, index) => (
              <LogSheet
                key={index}
                log={log}
                driverName={formData.driver_name}
                truckNumber={formData.truck_number}
                trailerNumber={formData.trailer_number}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
