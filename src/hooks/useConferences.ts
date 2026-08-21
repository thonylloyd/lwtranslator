import { useCallback, useSyncExternalStore } from "react";

import { conferenceRepository } from "@/services/data/conferenceStore";

export function useConferences() {
  const subscribe = useCallback((cb: () => void) => conferenceRepository.subscribe(cb), []);
  const list = useSyncExternalStore(
    subscribe,
    () => conferenceRepository.list(),
    () => conferenceRepository.list(),
  );
  return { conferences: list, repository: conferenceRepository };
}

export function useConference(id: string | undefined) {
  const { conferences, repository } = useConferences();
  const conference = id ? conferences.find((c) => c.id === id) : undefined;
  return { conference, repository };
}

export function useConferenceByCode(code: string | undefined) {
  const { conferences, repository } = useConferences();
  const normalised = code?.trim().toUpperCase();
  const conference = normalised ? conferences.find((c) => c.code === normalised) : undefined;
  return { conference, repository };
}
