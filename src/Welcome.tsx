import { useContext, useMemo, useState } from "react";
import { redirect, useNavigate } from "react-router-dom";
import { UserContext } from "./App";
import Dialog from "./Dialog";
import { supaClient } from "./supa-client";

export async function welcomeLoader() {
  const { data: { user } } = await supaClient.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  const { data } = await supaClient
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (data?.username) {
    return redirect("/");
  }

  return null;
}

export default function Welcome() {
  const user = useContext(UserContext);
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [serverError, setServerError] = useState("");
  const [formIsDirty, setFormIsDirty] = useState(false);
  const invalidString = useMemo(() => validateUsername(userName), [userName]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const { error } = await supaClient
      .from("user_profiles")
      .insert({
        user_id: user.session?.user.id,
        username: userName,
      })
      .select();

    if (error) {
      setServerError(
        error.message || `Username "${userName}" is already taken`
      );
      return;
    }

    // Success: remember the new profile and continue to the
    // page the user originally tried to reach
    user.profile = { username: userName };
    const target = window.localStorage.getItem("returnPath") || "/";
    window.localStorage.removeItem("returnPath");
    navigate(target);
  };

  return (
    <Dialog
      allowClose={false}
      open={true}
      contents={
        <>
          <h2 className="welcome-header">Welcome to the forum!!</h2>
          <p className="text-center">
            Let's get started by creating a Display Name:
          </p>
          <form className="welcome-name-form" onSubmit={handleSubmit}>
            <input
              name="username"
              placeholder="Username"
              className="welcome-name-input"
              onChange={({ target }) => {
                setUserName(target.value);
                setFormIsDirty(true);
                if (serverError) {
                  setServerError("");
                }
              }}
            />
            {formIsDirty && (invalidString || serverError) && (
              <p className="welcome-form-error-message validation-feedback">
                {serverError || invalidString}
              </p>
            )}
            <p className="text-center">
              This is the name people will see you as on the forum
            </p>
            <button
              className="welcome-form-submit-button"
              type="submit"
              disabled={invalidString != null}
            >
              Submit
            </button>
          </form>
        </>
      }
    />
  );
}

/**
 * Front-end validation only.
 * Server-side validation is done at the SQL level.
 */
function validateUsername(username: string): string | undefined {
  if (!username) {
    return "Username is required";
  }
  if (username.length < 4) {
    return "Username must be at least 4 characters long";
  }
  if (username.length > 19) {
    return "Username must be less than 20 characters long";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return undefined;
}
