"use client";

import { ClipboardCheck, RotateCw } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import { useMaintenanceChat } from "@/hooks/useMaintenanceChat";
import { deriveReportFields, isUrgentSignal } from "@/lib/maintenanceReport";
import { AIPresence } from "./AIPresence";
import { EmptyState } from "./EmptyState";
import { ConversationStream } from "./ConversationStream";
import { GatheredBar } from "./GatheredBar";
import { ChatComposer } from "./ChatComposer";
import { CaseFile } from "./CaseFile";
import { ReviewBrief } from "./ReviewBrief";
import { SuccessPanel } from "./SuccessPanel";
import { HelpfulResource } from "./HelpfulResource";
import { TalkToPersonPanel } from "./TalkToPersonPanel";
import { TicketHistoryPanel } from "./TicketHistoryPanel";

export function MaintenanceWorkspace() {
  const chat = useMaintenanceChat();

  return <>{renderPhase(chat)}</>;
}

function renderPhase(chat: ReturnType<typeof useMaintenanceChat>) {
  if (chat.phase === "empty") {
    return (
      <div className={`${styles.emptyLayout} ts-fade-in-up`}>
        <EmptyState value={chat.input} onChange={chat.setInput} onSubmit={chat.sendMessage} />
        <TicketHistoryPanel />
      </div>
    );
  }

  if (chat.phase === "success" && chat.submittedTicket) {
    return <SuccessPanel ticket={chat.submittedTicket} />;
  }

  if (chat.phase === "review" && chat.draft) {
    return (
      <div className={styles.reviewStage}>
        <ReviewBrief
          draft={chat.draft}
          draftStartedAt={chat.draftStartedAt}
          onUpdateDraft={chat.updateDraft}
          attachments={chat.attachments}
          onAttachImage={chat.attachImage}
          onRemoveAttachment={chat.removeAttachment}
          maxAttachments={chat.maxAttachments}
          onBackToConversation={chat.backToConversation}
          onDiscard={chat.discardRequest}
          onSubmit={chat.submitRequest}
          submitting={chat.submitting}
          submitError={chat.submitError}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.conversationGrid} ts-fade-in-up`}>
      <div className={styles.conversationColumn}>
        <div className={styles.conversationHeader}>
          <AIPresence state={chat.loading ? "thinking" : "idle"} size={30} />
          <div className={styles.conversationHeaderNames}>
            <div className={styles.conversationHeaderNameRow}>
              <span className={styles.conversationHeaderName}>TownSync AI Specialist</span>
              <span className={styles.diagnosticModeBadge}>Diagnostic Mode</span>
            </div>
            <div className={styles.conversationHeaderSub}>Analyzing diagnostic details in real-time</div>
          </div>
          <div className={styles.ticketDraftPill}>
            <RotateCw size={12} aria-hidden="true" />
            Ticket Draft #{chat.sessionId ? chat.sessionId.slice(-4).toUpperCase() : "----"}
          </div>
        </div>

        <GatheredBar summaryState={chat.summaryState} />

        <ConversationStream
          messages={chat.messages}
          loading={chat.loading}
          urgentNote={
            isUrgentSignal(deriveReportFields(chat.summaryState, chat.isComplete))
              ? "If this affects safety or building access, we'll mark this as an immediate priority for dispatch today."
              : null
          }
        />

        <TalkToPersonPanel
          visible={chat.canTalkToPerson}
          emergency={chat.emergencyDetected}
          escalating={chat.escalating}
          escalateError={chat.escalateError}
          onEscalate={chat.escalateToHuman}
        />

        <HelpfulResource category={chat.summaryState?.category ?? null} />

        {chat.isComplete ? (
          // The case file (with its own Review button) sits below the chat on
          // narrower screens; this keeps the next step in view without scrolling.
          <button type="button" className={styles.inlineReviewBtn} onClick={chat.beginReview}>
            <ClipboardCheck size={16} aria-hidden="true" /> All details gathered — Review &amp; submit
          </button>
        ) : null}

        <ChatComposer
          value={chat.input}
          onChange={chat.setInput}
          onSend={chat.sendMessage}
          disabled={chat.loading}
          suggestedOptions={chat.suggestedOptions}
          onPickSuggestedOption={chat.sendSuggestedOption}
        />
      </div>

      <CaseFile
        summaryState={chat.summaryState}
        isComplete={chat.isComplete}
        attachments={chat.attachments}
        onReviewSubmit={chat.beginReview}
      />
    </div>
  );
}

export default MaintenanceWorkspace;
