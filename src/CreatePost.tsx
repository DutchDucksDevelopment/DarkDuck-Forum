import { Session } from "@supabase/supabase-js";
import { useContext, useState } from "react";
import { UserContext } from "./App";
import { supaClient } from "./supa-client";

export interface CreatePostProps {
  newPostCreated?: () => void;
}

function createNewPost({
  session,
  title,
  content,
}: {
  session: Session | null;
  title: string;
  content: string;
}) {
  if (!session) {
    throw new Error("You must be signed in to create a post.");
  }

  return supaClient.rpc("create_post", {
    userid: session.user.id,
    title,
    content,
  });
}

export function CreatePost({
  newPostCreated = () => {},
}: CreatePostProps) {
  const { session } = useContext(UserContext);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const { error } = await createNewPost({ session, title, content });

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
        return;
      }

      setTitle("");
      setContent("");
      newPostCreated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create post.";
      console.error(error);
      setErrorMessage(message);
    }
  }

  return (
    <form
      className="create-post-form"
      data-e2e="create-post-form"
      onSubmit={handleSubmit}
    >
      <h3>Create A New Post</h3>

      <input
        type="text"
        name="title"
        className="create-post-title-input"
        placeholder="Your Title Here"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <textarea
        name="contents"
        placeholder="Your content here"
        className="create-post-content-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <div>
        <button type="submit" className="create-post-submit-button">
          Submit
        </button>
      </div>
    </form>
  );
}
