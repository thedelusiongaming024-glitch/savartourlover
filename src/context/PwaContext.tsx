"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
  dismissBanner: () => void;
  isBannerDismissed: boolean;
  showIosModal: boolean;
  setShowIosModal: (show: boolean) => void;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  isStandalone: false,
  promptInstall: async () => {},
  dismissBanner: () => {},
  isBannerDismissed: false,
  showIosModal: false,
  setShowIosModal: () => {},
});

const BANNER_STORAGE_KEY = "stl_pwa_banner_dismissed_at";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(true);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already running inside standalone PWA mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 3. Check dismissal memory
    try {
      const dismissedAt = localStorage.getItem(BANNER_STORAGE_KEY);
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        if (diff < DISMISS_DURATION_MS) {
          setIsBannerDismissed(true);
        } else {
          setIsBannerDismissed(false);
        }
      } else {
        setIsBannerDismissed(false);
      }
    } catch {
      setIsBannerDismissed(false);
    }

    // 4. Capture native beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 5. Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsBannerDismissed(true);
      try {
        localStorage.setItem(BANNER_STORAGE_KEY, Date.now().toString());
      } catch {}
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (isStandalone || isInstalled) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsBannerDismissed(true);
        }
      } catch (err) {
        console.warn("[PWA] Prompt error:", err);
      }
      return;
    }

    // If on iOS Safari, open instructional modal
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    // Fallback for desktop or non-prompting browsers: instruct user
    alert(
      "To install Savar Tour Lover:\n\n1. Tap the three dots (⋮) menu in your browser.\n2. Tap 'Add to Home screen' or 'Install App'."
    );
  };

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  // Can install if not already standalone and either prompt is ready or on iOS
  const canInstall = !isStandalone && !isInstalled && (Boolean(deferredPrompt) || isIos);

  return (
    <PwaContext.Provider
      value={{
        canInstall,
        isInstalled,
        isIos,
        isStandalone,
        promptInstall,
        dismissBanner,
        isBannerDismissed,
        showIosModal,
        setShowIosModal,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
