import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AUTOSAVE_DELAY_MS,
  SAVE_ENDPOINT,
  arePendingChangesEqual,
  createSaveBody,
  type PendingChanges,
  type StatusState,
} from "./tunerAutosaveState";

type UsePendingTunerAutosaveOptions = {
  pendingChanges: PendingChanges;
  selectedSectionId: number;
  setPendingChanges: Dispatch<SetStateAction<PendingChanges>>;
  trackId: string;
};

export function usePendingTunerAutosave({
  pendingChanges,
  selectedSectionId,
  setPendingChanges,
  trackId,
}: UsePendingTunerAutosaveOptions) {
  const isSavingRef = useRef(false);
  const [resetPending, setResetPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<StatusState>({ label: "Cached value", sectionId: null });
  const [saveTick, setSaveTick] = useState(0);

  useEffect(() => {
    const changes = Object.entries(pendingChanges);
    if (!changes.length || isSavingRef.current) return;

    const isResetSave = resetPending;
    setSaveStatus({ label: isResetSave ? "Resetting" : "Pending autosave", sectionId: selectedSectionId });
    const timeout = window.setTimeout(() => {
      const saveChanges = async () => {
        isSavingRef.current = true;
        setSaveStatus({ label: isResetSave ? "Resetting" : "Autosaving", sectionId: selectedSectionId });
        const savedChanges = Object.fromEntries(changes) as PendingChanges;
        try {
          const response = await fetch(SAVE_ENDPOINT, {
            body: createSaveBody(trackId, changes),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });

          if (!response.ok) throw new Error("Autosave failed");
        } catch {
          setSaveStatus({ label: "Autosave failed", sectionId: selectedSectionId });
          isSavingRef.current = false;
          return;
        }

        setPendingChanges((current) => {
          const next = { ...current };
          Object.entries(savedChanges).forEach(([sectionId, change]) => {
            const numericSectionId = Number(sectionId);
            if (arePendingChangesEqual(current[numericSectionId], change)) delete next[numericSectionId];
          });

          return next;
        });
        setResetPending(false);
        setSaveStatus({ label: isResetSave ? "Cached value" : "Autosaved", sectionId: selectedSectionId });
        isSavingRef.current = false;
        setSaveTick((tick) => tick + 1);
      };

      void saveChanges();
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [pendingChanges, resetPending, saveTick, selectedSectionId, setPendingChanges, trackId]);

  return {
    markResetPending: () => setResetPending(true),
    pokeSave: () => setSaveTick((tick) => tick + 1),
    saveStatus,
    setSaveStatus,
  };
}
