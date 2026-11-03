import { Session } from "@supabase/supabase-js";
import { useContext, useRef, useState } from "react";
import { UserContext } from "./App";
import { supaClient } from "./supa-client";

export interface CreatePostProps {
  newPostCreated?: () => void;
}

/**
 * Calls the `create_new_post` RPC.
 * Note: the parameter is `userid` (lowercase) to match
 * the argument name of the Postgres function.
 */
function createNewPost({
  session,
  title,
  content,
}: {
  session: Session | null;
  title: string;
  content: string;
}) {
  return supaClient.rpc("create_new_post", {
    userid: session?.user.id,
    title,
    content,
  });
}

export function CreatePost({ newPostCreated = () => {} }: CreatePostProps) {
  const { session } = useContext(UserContext);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    createNewPost({ session, title, content }).then(({ error }) => {
      if (error) {
        console.error("Failed to create post:", error);
        return;
      }

      // Reset the form on success
      setTitle("");
      setContent("");
      if (titleInputRef.current) titleInputRef.current.value = "";
      if (contentInputRef.current) contentInputRef.current.value = "";
      newPostCreated();
    });
  };

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
        ref={titleInputRef}
        className="create-post-title-input"
        placeholder="Your Title Here"
        onChange={({ target: { value } }) => setTitle(value)}
      />
      <textarea
        name="contents"
        ref={contentInputRef}
        placeholder="Your content here"
        className="create-post-content-input"
        onChange={({ target: { value } }) => setContent(value)}
      />
      <div>
        <button type="submit" className="create-post-submit-button">
          Submit
        </button>
      </div>
    </form>
  );
}
