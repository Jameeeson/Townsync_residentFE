"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  FileDown,
  History,
  Download,
  Landmark,
  Zap,
  Users2,
  Activity,
  CheckCircle2,
} from "lucide-react";
import styles from "@/components/styles/ConfigureReport.module.css";

const CATEGORIES = [
  {
    id: "financials",
    title: "Financials",
    description: "Revenue tracking, expense audits, and monthly balance sheets.",
    icon: Landmark,
    color: "#2441b4",
  },
  {
    id: "visitor",
    title: "Visitor Traffic",
    description: "Entry/exit logs, peak visitation times, and security trends.",
    icon: Activity,
    color: "#059669",
  },
  {
    id: "maintenance",
    title: "Maintenance Efficiency",
    description: "Repair turnaround time, contractor ratings, and cost per unit.",
    icon: Zap,
    color: "#b45309",
  },
  {
    id: "demographics",
    title: "Resident Demographics",
    description: "Occupancy rates, age distribution, and amenity usage stats.",
    icon: Users2,
    color: "#4338ca",
  },
];

const RECENT_REPORTS = [
  {
    name: "Q3_Maintenance_Summary_2023.pdf",
    date: "Oct 12, 2023",
    time: "09:45 AM",
    format: "PDF",
    size: "2.4 MB",
    status: "Ready",
  },
  {
    name: "August_CashFlow_Priority_Analysis.xlsx",
    date: "Sep 01, 2023",
    time: "14:20 PM",
    format: "Excel",
    size: "850 KB",
    status: "Ready",
  },
];

type ConfigureReportViewProps = {
  onBack: () => void;
};

export default function ConfigureReportView({ onBack }: ConfigureReportViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("financials");
  const [format, setFormat] = useState("PDF");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} aria-label="Go back" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <div className={styles.titleArea}>
          <h1>Configure Report</h1>
          <p>Select parameters to extract detailed analytical insights from the townhouse ecosystem.</p>
        </div>
      </header>

      <div className={styles.configGrid}>
        <section className={styles.configCard}>
          <div className={styles.sectionTitle}>
            <BarChart3 size={18} />
            <h2>Report Category</h2>
          </div>
          <div className={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryCard} ${
                    selectedCategory === cat.id ? styles.activeCategory : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className={styles.cardTop}>
                    <Icon size={20} style={{ color: cat.color }} />
                    <h3>{cat.title}</h3>
                  </div>
                  <p>{cat.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.sideOptions}>
          <section className={styles.configCard}>
            <div className={styles.sectionTitle}>
              <Calendar size={18} />
              <h2>Date Range</h2>
            </div>
            <div className={styles.dateInputs}>
              <div className={styles.inputGroup}>
                <label htmlFor="startDate">Start Date</label>
                <input id="startDate" type="date" />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="endDate">End Date</label>
                <input id="endDate" type="date" />
              </div>
            </div>
          </section>

          <section className={styles.configCard}>
            <div className={styles.sectionTitle}>
              <FileDown size={18} />
              <h2>Export Format</h2>
            </div>
            <div className={styles.formatToggle}>
              <button
                type="button"
                className={format === "PDF" ? styles.activeToggle : undefined}
                onClick={() => setFormat("PDF")}
              >
                PDF
              </button>
              <button
                type="button"
                className={format === "Excel" ? styles.activeToggle : undefined}
                onClick={() => setFormat("Excel")}
              >
                Excel
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.actionArea}>
        <button type="button" className={styles.generateBtn}>
          Compile and Generate
        </button>
      </div>

      <section className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div className={styles.sectionTitle}>
            <History size={18} />
            <h2>Recent Reports</h2>
          </div>
          <button type="button" className={styles.viewAllBtn}>
            View All History
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Generated On</th>
                <th>Format</th>
                <th>Size</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REPORTS.map((report) => (
                <tr key={report.name}>
                  <td className={styles.fileName}>{report.name}</td>
                  <td>
                    <div className={styles.dateTime}>
                      <span>{report.date}</span>
                      <span className={styles.timeDot}>•</span>
                      <span>{report.time}</span>
                    </div>
                  </td>
                  <td>{report.format}</td>
                  <td>{report.size}</td>
                  <td>
                    <span className={styles.statusBadge}>
                      <CheckCircle2 size={12} />
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className={styles.downloadBtn}>
                      <Download size={16} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
