import { Outlet, useLocation } from "react-router-dom";
import { UserContext } from "./App";
import { useContext, useEffect, useState } from "react";
import Login from "./Login";

export default function MessageBoard() {
  const userProfile = useContext(UserContext);
  const location = useLocation();
  const [homeState, setHomeState] = useState(window.location.pathname == "/");
  
  useEffect(() => {
    if (location.pathname == "/") {
      setHomeState(true);
    } else {
      setHomeState(false);
    }
  }, [location]);

  return (
    <div className="message-board-container">
      {userProfile.session ? (
        <div>
          <h2 className="message-board-header-link">DarkDuck Forum</h2>
          {homeState ? < IntroMessage /> : <></>}
        </div>
      ) : (
        <div>
          <h2 className="message-board-header-link">Welcome to the forum!</h2>
          <h2
            className="message-board-login-message"
            data-e2e="message-board-login"
          >
            Please <Login /> to post and comment.
          </h2>
          < IntroMessage />
        </div>
      )}
      <Outlet />
    </div>
  );
}

export function IntroMessage() {
  return (
    <>
    <div className="message-board-intro-container">
      <h3 className="message-board-intro">This is a simple forum trying to be an international version of the Dutch Kindertelefoon Forum.</h3>
      <h3
        className="message-board-intro"
      >
      </h3>
    </div>
		<div className="message-board-intro-container mt-8">
		  <h3 className="message-board-intro">Rules:</h3>
		  <ul>
		    <li>
		       - This forum is intended for children ages 12–18 to discuss their problems
		      or questions. For more information, translate “Forum Regels” from the
		      Kindertelefoon Forum.
		    </li>
		    <li>
		       - NSFW topics are allowed only if they’re non-graphic. For example: Questions about STIs
		      are allowed, but porn advertisements and child sexual abuse material (including recordings you, as a child, made) are
		      absolutely prohibited.
		    </li>
		    <li>
					 - Of course, I can't detect people's ages, and I can't block adults from accessing this website. But if there is evidence that your age is above 18, your account will be removed.
				</li>
				<li>
					 - Sharing personal information is prohibited, and so is trying to chat with users off-platform.
				</li>	 
		    <li>
					 - If you catch any posts or comments that break these rules, E-mail them to dutchducksdevelopment@gmail.com
		    </li>
		  </ul>
		</div>
    </>
  );
}
