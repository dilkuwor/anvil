"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

export function GoogleSignInButton({
  mode,
  onCredential,
}: {
  mode: "login" | "register";
  onCredential: (credential: string) => void;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const credentialRef = useRef(onCredential);

  useEffect(() => {
    credentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !scriptReady) return;
    const container = containerRef.current;
    const google = window.google;
    if (!container || !google) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          credentialRef.current(response.credential);
        }
      },
    });
    google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: mode === "login" ? "signin_with" : "signup_with",
      logo_alignment: "center",
      width: container.offsetWidth,
    });
  }, [mode, scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={GIS_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className="flex justify-center" ref={containerRef} />
    </>
  );
}
