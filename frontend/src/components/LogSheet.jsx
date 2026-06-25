import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";

function getRowForType(type) {
  if (type === "off_duty") return 0;
  if (type === "sleeper") return 1;
  if (type === "driving") return 2;
  if (type === "on_duty") return 3;
  return 0;
}

function getTotals(events) {
  const totals = {
    off_duty: 0,
    sleeper: 0,
    driving: 0,
    on_duty: 0,
  };

  events.forEach((event) => {
    if (totals[event.type] !== undefined) {
      totals[event.type] += event.end - event.start;
    }
  });

  return totals;
}

function formatHourToTime(hourFloat) {
  const totalMinutes = Math.round(hourFloat * 60);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  const amPm = hour < 12 ? "AM" : "PM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;

  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${amPm}`;
}

function getDateForDay(dayNumber) {
  const today = new Date();
  today.setDate(today.getDate() + dayNumber - 1);
  return today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function LogSheet({ log, driverName, truckNumber, trailerNumber }) {
  const totals = getTotals(log.events);
  const logRef = useRef();

  const handleDownloadPDF = async () => {
    const element = logRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ELD-Log-Day-${log.day}.pdf`);
  };

  return (
    <div className="logsheet-card" ref={logRef}>

      {/* ELD Header */}
      <div className="eld-header">
        <div className="eld-header-top">
          <h3>Driver's Daily Log — Day {log.day}</h3>
          <span className="eld-badge">ELD Record</span>
        </div>

        <div className="eld-header-fields">
          <div className="eld-field">
            <label>Date</label>
            <span>{getDateForDay(log.day)}</span>
          </div>
          <div className="eld-field">
            <label>Driver Name</label>
            <span>{driverName || "— — —"}</span>
          </div>
          <div className="eld-field">
            <label>Truck #</label>
            <span>{truckNumber || "— — —"}</span>
          </div>
          <div className="eld-field">
            <label>Trailer #</label>
            <span>{trailerNumber || "— — —"}</span>
          </div>
          <div className="eld-field">
            <label>Carrier</label>
            <span>Spotter Logistics</span>
          </div>
          <div className="eld-field">
            <label>Total Miles Today</label>
            <span>{(totals.driving * 60).toFixed(0)} mi (est.)</span>
          </div>
        </div>

        <div className="eld-rule-note">
          📋 Property-carrying driver — 70 hrs / 8 days cycle — No adverse conditions
        </div>
      </div>

      {/* Log Grid */}
      <div className="log-grid-wrapper">
        <div className="log-labels">
          <div>Off Duty</div>
          <div>Sleeper</div>
          <div>Driving</div>
          <div>On Duty</div>
        </div>

        <div className="log-grid four-row-grid">
          <div className="row-divider"></div>

          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="hour-cell">
              <span>{hour}</span>
            </div>
          ))}

          {log.events.map((event, index) => {
            const row = getRowForType(event.type);
            const left = (event.start / 24) * 100;
            const width = ((event.end - event.start) / 24) * 100;

            return (
              <div
                key={index}
                className={`event-bar ${event.type}`}
                style={{
                  top: `${row * 60 + 10}px`,
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`${event.type} ${event.start} - ${event.end}`}
              >
                {event.label ? event.label : event.type.replace("_", " ")}
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="log-totals">
        <div><strong>Off Duty:</strong> {totals.off_duty.toFixed(2)} hrs</div>
        <div><strong>Sleeper:</strong> {totals.sleeper.toFixed(2)} hrs</div>
        <div><strong>Driving:</strong> {totals.driving.toFixed(2)} hrs</div>
        <div><strong>On Duty:</strong> {totals.on_duty.toFixed(2)} hrs</div>
      </div>

      {/* Remarks */}
      <div className="remarks-box">
        <h4>Remarks</h4>
        <ul>
          {log.events
            .filter((e) => e.label)
            .map((e, i) => (
              <li key={i}>
                {e.label} — {formatHourToTime(e.start)} to {formatHourToTime(e.end)}
              </li>
            ))}
        </ul>
      </div>

      {/* PDF Download Button */}
     <button className="pdf-btn" onClick={handleDownloadPDF}>
  ⬇️ Download Day {log.day} Log as PDF
</button>
    </div>
  );
}

export default LogSheet;