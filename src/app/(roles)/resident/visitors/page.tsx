"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/qrpass.module.css";
import { 
  PlusCircle, ShieldCheck, Calendar, Clock, 
  Car, User, Send, Check, X 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface VisitorPass {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  hasVehicle: boolean;
}

export default function PassesPage() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  
  // List and Modal States
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGeneratedPass, setLastGeneratedPass] = useState<VisitorPass | null>(null);

  const handleGenerate = () => {
    if (!visitorName || !startDate || !startTime) return;

    const formattedDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newPass: VisitorPass = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}-PASS`,
      name: visitorName,
      type: vehiclePlate ? "Contractor / Vehicle" : "Guest / Pedestrian",
      date: formattedDate,
      time: `${formattedTime} onwards`,
      hasVehicle: vehiclePlate.length > 0
    };

    setPasses([newPass, ...passes]);
    setLastGeneratedPass(newPass);
    setShowSuccess(true); // Open the pop-up

    // Reset Form
    setVisitorName("");
    setVehiclePlate("");
  };

  return (
    <div className={styles.container}>
      {/* 1. SUCCESS POPUP WINDOW */}
      {showSuccess && lastGeneratedPass && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.successIcon}><Check size={28} /></div>
            <h2 style={{ marginBottom: '8px' }}>Pass Generated!</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              The visitor pass for {lastGeneratedPass.name} is now active.
            </p>
            
            {/* Display the QR in the popup */}
            <div className={styles.qrBorder} style={{ margin: '0 auto', width: 'fit-content' }}>
              <QRCodeSVG value={lastGeneratedPass.id} size={150} />
            </div>
            <div style={{ marginTop: '12px', fontWeight: 700, color: '#1e3a8a' }}>
              ID: {lastGeneratedPass.id}
            </div>

            <button className={styles.closeBtn} onClick={() => setShowSuccess(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN PAGE CONTENT */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Visitor Passes</h1>
        <p className={styles.pageDesc}>Manage access for your guests and view active passes.</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.formCard}>
          <div className={styles.formHeader}><PlusCircle size={20} /> Request New Pass</div>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Visitor Name</label>
              <input value={visitorName} onChange={(e) => setVisitorName(e.target.value)} className={styles.input} placeholder="Jane Doe" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vehicle Plate</label>
              <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} className={styles.input} placeholder="ABC-123" />
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <DatePicker selected={startDate} onChange={(d: Date | null) => setStartDate(d)} dateFormat="MM/dd/yyyy" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Arrival</label>
                <DatePicker selected={startTime} onChange={(d: Date | null) => setStartTime(d)} showTimeSelect showTimeSelectOnly dateFormat="h:mm aa" />
              </div>
            </div>
            <button type="button" className={styles.submitBtn} onClick={handleGenerate}>
              <Send size={16} /> Generate Pass
            </button>
          </form>
        </aside>

        <main>
          <div className={styles.activeHeader}>
            <div className={styles.activeTitle}><ShieldCheck size={18} color="#15803d" /> Active Passes</div>
            <div className={styles.limitText}>{passes.length} of 5 used</div>
          </div>

          <div className={styles.passesGrid}>
            {passes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                No active passes yet. Create one on the left.
              </div>
            ) : (
              passes.map((pass) => (
                <div key={pass.id} className={styles.passCard}>
                  <div className={styles.cardTop}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className={styles.visitorName}>{pass.name}</span>
                      {pass.hasVehicle ? <Car size={16} color="#94a3b8" /> : <User size={16} color="#94a3b8" />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>{pass.type}</div>
                    <div style={{ fontSize: '12px', display: 'flex', gap: '8px', marginBottom: '4px' }}><Calendar size={14} /> {pass.date}</div>
                    <div style={{ fontSize: '12px', display: 'flex', gap: '8px' }}><Clock size={14} /> {pass.time}</div>
                  </div>
                  <div className={styles.qrContainer}>
                    <button
                      type="button"
                      onClick={() => router.push("/resident/visitors/details")}
                      style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                      aria-label={`Open details for pass ${pass.id}`}
                    >
                      <div className={styles.qrBorder}><QRCodeSVG value={pass.id} size={80} /></div>
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', fontSize: '10px', fontWeight: 700 }}>{pass.id}</div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}