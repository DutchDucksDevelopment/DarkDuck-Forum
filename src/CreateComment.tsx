import { Session } from "@supabase/supabase-js";
import { useContext, useState } from "react";
import { UserContext } from "./App";
import { supaClient } from "./supa-client";

export interface CreateCommentProps {
  parentPostId: string;
  commentCreated?: () => void;
}

function createComment({
  session,
  parentPostId,
  content,
}: {
  session: Session | null;
  parentPostId: string;
  content: string;
}) {
  if (!session) {
    throw new Error("You must be signed in to comment.");
  }

  return supaClient.rpc("create_comment", {
    parent_post_id: parentPostId,
    comment_content: content,
    commenter_id: session.user.id,
  });
}

export function CreateComment({
  parentPostId,
  commentCreated = () => {},
}: CreateCommentProps) {
  const { session } = useContext(UserContext);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const { error } = await createComment({
        session,
        parentPostId,
        content,
      });

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
        return;
      }

      setContent("");
      commentCreated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create comment.";
      console.error(error);
      setErrorMessage(message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        name="content"
        placeholder="Write a comment"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button type="submit">Comment</button>
    </form>
  );
}
