"use client";

import styles from "@/styles/maintenance.module.css";
import { useMaintenanceChat } from "@/hooks/useMaintenanceChat";
import { AIPresence } from "./AIPresence";
import { EmptyState } from "./EmptyState";
import { ConversationStream } from "./ConversationStream";
import { ChatComposer } from "./ChatComposer";
import { CaseFile } from "./CaseFile";
import { ReviewBrief } from "./ReviewBrief";
import { SuccessPanel } from "./SuccessPanel";
import { HelpfulResource } from "./HelpfulResource";
import { DevPreviewBar } from "./DevPreviewBar";
import { TicketHistoryPanel } from "./TicketHistoryPanel";

export function MaintenanceWorkspace() {
  const chat = useMaintenanceChat();

  return (
    <>
      {renderPhase(chat)}
      <DevPreviewBar onPreview={chat.previewPhase} />
    </>
  );
}

function renderPhase(chat: ReturnType<typeof useMaintenanceChat>) {
  if (chat.phase === "empty") {
    return (
      <div className={`${styles.workspaceCentered} ts-fade-in-up`}>
        <EmptyState
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={chat.sendMessage}
          attachments={chat.attachments}
          onAttachImage={chat.attachImage}
          onRemoveAttachment={chat.removeAttachment}
          maxAttachments={chat.maxAttachments}
        />
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
          onUpdateDraft={chat.updateDraft}
          attachments={chat.attachments}
          onAttachImage={chat.attachImage}
          onRemoveAttachment={chat.removeAttachment}
          maxAttachments={chat.maxAttachments}
          onBackToConversation={chat.backToConversation}
          onSubmit={chat.submitRequest}
          submitting={chat.submitting}
          submitError={chat.submitError}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.workspaceCentered} ts-fade-in-up`}>
      <div className={styles.conversationColumn}>
        <div className={styles.conversationHeader}>
          <AIPresence state={chat.loading ? "thinking" : "idle"} size={30} />
          <div>
            <div className={styles.conversationHeaderName}>TownCare AI</div>
            <div className={styles.conversationHeaderSub}>Building your maintenance report as you talk</div>
          </div>
        </div>

        <ConversationStream messages={chat.messages} loading={chat.loading} />

        <HelpfulResource category={chat.summaryState?.category ?? null} />

        <ChatComposer
          value={chat.input}
          onChange={chat.setInput}
          onSend={chat.sendMessage}
          disabled={chat.loading}
          suggestedOptions={chat.suggestedOptions}
          onPickSuggestedOption={chat.sendSuggestedOption}
          attachments={chat.attachments}
          onAttachImage={chat.attachImage}
          onRemoveAttachment={chat.removeAttachment}
          maxAttachments={chat.maxAttachments}
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
