"use client";
import React from 'react';
import styles from "@/styles/visitordets.module.css";
import { 
  ArrowLeft, Edit3, Phone, Mail, Calendar, 
  Car, Shield, Building2, MapPin, 
  Download, Info, XCircle, MoveRight
} from "lucide-react";

export default function VisitorDetails() {
  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/resident/visitors" className={styles.backLink}>
            <ArrowLeft size={16} /> Visitor Passes
          </a>
          <div className={styles.titleRow}>
            <h1>Visitor Details: Michael Smith</h1>
            <span className={styles.statusBadge}>• Active</span>
          </div>
        </div>
        <button className={styles.editBtn}>
          <Edit3 size={16} /> Edit Pass
        </button>
      </header>

      <div className={styles.mainLayout}>
        {/* Left Column: Details */}
        <div className={styles.contentColumn}>
          
          {/* Profile Card */}
          <section className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.profileName}>
                <h2>Michael Smith</h2>
                <span className={styles.typeBadge}>Contractor</span>
              </div>
              <p className={styles.subText}>Master Flow Priority Plumbing Services</p>
            </div>
            
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Phone size={18} className={styles.iconBlue} />
                <span>(555) 012-3456</span>
              </div>
              <div className={styles.contactItem}>
                <Mail size={18} className={styles.iconBlue} />
                <span>m.smith@masterflowpriority.com</span>
              </div>
            </div>
          </section>

          {/* Schedule & Vehicle Grid */}
          <div className={styles.twoColumnGrid}>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Calendar size={18} /> VISIT SCHEDULE
              </h3>
              <div className={styles.dataRow}>
                <span className={styles.label}>Date</span>
                <span className={styles.value}>Oct 24, 2023</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.label}>Arrival</span>
                <span className={styles.value}>09:00 AM</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.label}>Departure</span>
                <span className={styles.value}>05:00 PM</span>
              </div>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Car size={18} /> VEHICLE DETAILS
              </h3>
              <div className={styles.dataRow}>
                <span className={styles.label}>Model</span>
                <span className={styles.value}>White Ford Transit</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.label}>License Plate</span>
                <span className={styles.value}>ABC-1234</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.label}>Parking</span>
                <span className={styles.value}>Service Bay 02</span>
              </div>
            </section>
          </div>

          {/* Access Permissions */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Shield size={18} /> ACCESS PERMISSIONS
            </h3>
            <div className={styles.permissionGrid}>
              <div className={styles.permissionBox}>
                <Building2 size={20} className={styles.iconBlue} />
                <div>
                  <p className={styles.permLabel}>DESTINATION</p>
                  <p className={styles.permValue}>Unit 402B</p>
                </div>
              </div>
              <div className={styles.permissionBox}>
                <MapPin size={20} className={styles.iconBlue} />
                <div>
                  <p className={styles.permLabel}>POINT OF ENTRY</p>
                  <p className={styles.permValue}>Service Entrance</p>
                </div>
              </div>
              <div className={styles.permissionBox}>
                <MoveRight size={20} className={styles.iconBlue} />
                <div>
                  <p className={styles.permLabel}>ROUTE</p>
                  <p className={styles.permValue}>Freight Elevator A</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Digital Pass */}
        <aside className={styles.sidebar}>
          <div className={styles.digitalPassCard}>
            <p className={styles.passHeader}>DIGITAL VISITOR PASS</p>
            <div className={styles.qrContainer}>
              {/* Replace with your real QR path */}
              <img src="/qr-placeholder.png" alt="QR Code" className={styles.qrImage} />
            </div>
            <div className={styles.passInfo}>
              <p className={styles.passId}>Pass ID: #8472-A</p>
              <p className={styles.validity}>Valid until Oct 24, 05:00 PM</p>
            </div>
            <button className={styles.downloadBtn}>
              <Download size={18} /> Download PDF Pass
            </button>
          </div>

          <div className={styles.alertBox}>
            <Info size={20} className={styles.iconBlue} />
            <p>
              This pass is restricted to the designated service entrance and Unit 402B. 
              Any deviation may trigger a security alert.
            </p>
          </div>

          <button className={styles.revokeBtn}>
            <XCircle size={18} /> Revoke Access
          </button>
        </aside>
      </div>
    </div>
  );
}