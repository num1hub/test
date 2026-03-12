'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  resolveCapsuleGraphQuality,
  resolveCapsuleVisualProfile,
  type CapsuleGraphQualityKey,
  type CapsuleVisualProfileKey,
} from '@/lib/capsuleVisualProfile';

export const DEFAULT_CAPSULE_VISUAL_OWNER_ID = 'capsule.person.egor-n1.v1';

function isVisualProfileKey(value: string | null): value is CapsuleVisualProfileKey {
  return value === 'mnemonic' || value === 'architect' || value === 'cinematic';
}

function isGraphQualityKey(value: string | null): value is CapsuleGraphQualityKey {
  return value === 'ultra' || value === 'balanced' || value === 'lite';
}

export function getCapsuleVisualPreferenceStorageKeys(ownerProfileId = DEFAULT_CAPSULE_VISUAL_OWNER_ID) {
  return {
    visualProfile: `workspace-visual-profile:${ownerProfileId}`,
    graphQuality: `workspace-graph-quality:${ownerProfileId}`,
  };
}

export function useCapsuleVisualPreferences(ownerProfileId = DEFAULT_CAPSULE_VISUAL_OWNER_ID) {
  const [visualProfile, setVisualProfile] = useState<CapsuleVisualProfileKey>('mnemonic');
  const [graphQuality, setGraphQuality] = useState<CapsuleGraphQualityKey>('balanced');

  const storageKeys = useMemo(
    () => getCapsuleVisualPreferenceStorageKeys(ownerProfileId),
    [ownerProfileId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedVisualProfile = window.localStorage.getItem(storageKeys.visualProfile);
    if (isVisualProfileKey(storedVisualProfile)) {
      setVisualProfile(storedVisualProfile);
    }

    const storedGraphQuality = window.localStorage.getItem(storageKeys.graphQuality);
    if (isGraphQualityKey(storedGraphQuality)) {
      setGraphQuality(storedGraphQuality);
    }
  }, [storageKeys.graphQuality, storageKeys.visualProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.visualProfile, visualProfile);
  }, [storageKeys.visualProfile, visualProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.graphQuality, graphQuality);
  }, [graphQuality, storageKeys.graphQuality]);

  return {
    ownerProfileId,
    visualProfile,
    graphQuality,
    setVisualProfile,
    setGraphQuality,
    resolvedVisualProfile: resolveCapsuleVisualProfile(visualProfile),
    resolvedGraphQuality: resolveCapsuleGraphQuality(graphQuality),
  };
}
