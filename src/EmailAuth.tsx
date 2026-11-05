import { SupabaseClient } from "@supabase/supabase-js";
import React, { useEffect, useRef, useState } from "react";
import {
  I18nVariables,
  RedirectTo,
  ViewSignUp,
  ViewSignIn,
  VIEWS,
  ViewType,
} from "@supabase/auth-ui-shared";
import { Appearance } from "./../../../types";
import {
  Anchor,
  Container,
  Input,
  Label,
  Message,
} from "./ui/";

export interface EmailAuthProps {
  authView?: ViewSignIn | ViewSignUp;
  defaultEmail?: string;
  defaultPassword?: string;
  setAuthView?: any;
  setDefaultEmail?: (email: string) => void;
  setDefaultPassword?: (password: string) => void;
  supabaseClient: SupabaseClient;
  showLinks?: boolean;
  redirectTo?: RedirectTo;
  additionalData?: { [key: string]: any };
  magicLink?: boolean;
  i18n?: I18nVariables;
  appearance?: Appearance;
  passwordLimit?: boolean;
  children?: React.ReactNode;
}

function EmailAuth({
  authView = "sign_in",
  defaultEmail = "",
  defaultPassword = "",
  setAuthView = () => {},
  setDefaultEmail = () => {},
  setDefaultPassword = () => {},
  supabaseClient,
  showLinks = false,
  redirectTo,
  additionalData,
  magicLink,
  i18n,
  appearance,
  passwordLimit = false,
  children,
}: EmailAuthProps) {
  const isMounted = useRef(true);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    isMounted.current = true;
    setEmail(defaultEmail);
    setPassword(defaultPassword);

    return () => {
      isMounted.current = false;
    };
  }, [authView, defaultEmail, defaultPassword]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const username = email.trim();

    if (!/^[A-Za-z0-9_]{4,19}$/.test(username)) {
      setError(
        "Username must be 4–19 characters and contain only letters, numbers, and underscores."
      );
      return;
    }

    if (passwordLimit && password.length > 72) {
      setError("Password exceeds the maximum length of 72 characters.");
      return;
    }

    const authEmail = `${username}@ddf.com`;
    setLoading(true);

    try {
      if (authView === "sign_in") {
        const { error: signInError } =
          await supabaseClient.auth.signInWithPassword({
            email: authEmail,
            password,
          });

        if (signInError) setError(signInError.message);
      } else if (authView === "sign_up") {
        const { data, error: signUpError } =
          await supabaseClient.auth.signUp({
            email: authEmail,
            password,
            options: {
              emailRedirectTo: redirectTo,
              data: additionalData,
            },
          });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data.user && !data.session) {
          setMessage(
            i18n?.sign_up?.confirmation_text ??
              "Check your email to confirm your account."
          );
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleViewChange = (newView: ViewType) => {
    setDefaultEmail(email);
    setDefaultPassword(password);
    setAuthView(newView);
  };

  const labels = i18n?.[authView];

  return (
    <form
      id={authView === "sign_in" ? "auth-sign-in" : "auth-sign-up"}
      onSubmit={handleSubmit}
      autoComplete="on"
      style={{ width: "100%" }}
    >
      <Container direction="vertical" gap="large" appearance={appearance}>
        <Container direction="vertical" gap="large" appearance={appearance}>
          <div>
            <Label htmlFor="username" appearance={appearance}>
              {labels?.email_label ?? "Username"}
            </Label>
            <Input
              id="username"
              type="text"
              name="username"
              placeholder={labels?.email_input_placeholder ?? "Your username"}
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              autoComplete="username"
              appearance={appearance}
            />
          </div>

          <div>
            <Label htmlFor="password" appearance={appearance}>
              {labels?.password_label ?? "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder={labels?.password_input_placeholder ?? "Your password"}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              autoComplete={
                authView === "sign_in" ? "current-password" : "new-password"
              }
              appearance={appearance}
            />
          </div>

          {children}
        </Container>

        <button type="submit" disabled={loading}>
          {loading
            ? labels?.loading_button_label ?? "Loading…"
            : labels?.button_label ?? (authView === "sign_in" ? "Sign in" : "Sign up")}
        </button>

        {showLinks && (
          <Container direction="vertical" gap="small" appearance={appearance}>
            {authView === VIEWS.SIGN_IN && magicLink && (
              <Anchor
                href="#auth-magic-link"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  setAuthView(VIEWS.MAGIC_LINK);
                }}
                appearance={appearance}
              >
                {i18n?.magic_link?.link_text}
              </Anchor>
            )}

            {authView === VIEWS.SIGN_IN && (
              <Anchor
                href="#auth-forgot-password"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  setAuthView(VIEWS.FORGOTTEN_PASSWORD);
                }}
                appearance={appearance}
              >
                {i18n?.forgotten_password?.link_text}
              </Anchor>
            )}

            {authView === VIEWS.SIGN_IN ? (
              <Anchor
                href="#auth-sign-up"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  handleViewChange(VIEWS.SIGN_UP);
                }}
                appearance={appearance}
              >
                {i18n?.sign_up?.link_text ?? "Sign up"}
              </Anchor>
            ) : (
              <Anchor
                href="#auth-sign-in"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  handleViewChange(VIEWS.SIGN_IN);
                }}
                appearance={appearance}
              >
                {i18n?.sign_in?.link_text ?? "Sign in"}
              </Anchor>
            )}
          </Container>
        )}
      </Container>

      {message && <Message appearance={appearance}>{message}</Message>}
      {error && (
        <Message color="danger" appearance={appearance}>
          {error}
        </Message>
      )}
    </form>
  );
}

export { EmailAuth };
