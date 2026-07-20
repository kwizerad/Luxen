/**
 * Type declarations for Google Identity Services (GIS).
 *
 * These declarations describe the subset of the GIS API used by the
 * application. They are intentionally minimal and avoid importing the
 * full `@types/google.accounts` package, keeping the bundle lean and
 * the implementation SSR-safe.
 */

declare global {
  interface GoogleCredentialResponse {
    credential: string;
    select_by?:
      | "auto"
      | "user"
      | "btn"
      | "btn_confirm"
      | "brn_add_session"
      | "btn_confirm_add_session";
    clientId?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback?: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    ux_mode?: "popup" | "redirect";
    state_cookie_domain?: string;
    allowed_parent_origin?: string | string[];
    itp_support?: boolean;
    login_uri?: string;
    nonce?: string;
  }

  interface GooglePromptMomentNotification {
    isDisplayMoment: () => boolean;
    isDisplayed: () => boolean;
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    isDismissedMoment: () => boolean;
    getNotDisplayedReason: () => GooglePromptNotDisplayedReason;
    getSkippedReason: () => GooglePromptSkippedReason;
    getDismissedReason: () => GooglePromptDismissedReason;
  }

  type GooglePromptNotDisplayedReason =
    | "browser_not_supported"
    | "invalid_client"
    | "missing_client_id"
    | "opt_out_or_no_session"
    | "secure_http_required"
    | "suppressed_by_user"
    | "unregistered_origin"
    | "unknown_reason";

  type GooglePromptSkippedReason =
    | "auto_cancel"
    | "user_cancel"
    | "tap_outside"
    | "issuing_failed";

  type GooglePromptDismissedReason =
    | "credential_returned"
    | "cancel_called"
    | "flow_restarted";

  interface GoogleButtonConfiguration {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    logo_alignment?: "left" | "center";
    width?: string | number;
    locale?: string;
    click_listener?: () => void;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          prompt: (
            momentListener?: (notification: GooglePromptMomentNotification) => void
          ) => void;
          renderButton: (
            parent: HTMLElement,
            options: GoogleButtonConfiguration
          ) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initCodeClient: (config: unknown) => { requestCode: () => void };
          initTokenClient: (config: unknown) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export {};
