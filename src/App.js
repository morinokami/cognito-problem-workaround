import React from "react";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";
import { Auth } from "aws-amplify";

import axios from "axios";

const UpdateEmail = () => {
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleUpdate = async (event) => {
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser().catch(() => null);
    user.getSession(async (error, session) => {
      if (error) {
        return;
      }

      await axios.post(
        "https://bsw4oc1znf.execute-api.ap-northeast-1.amazonaws.com/test/email",
        {
          email,
        },
        {
          headers: {
            Authorization: session.getIdToken().jwtToken,
          },
        }
      );
    });
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser().catch(() => null);
    user.getSession(async (error, session) => {
      if (error) {
        return;
      }

      await axios.post(
        "https://bsw4oc1znf.execute-api.ap-northeast-1.amazonaws.com/test/confirm",
        {
          code,
          accessToken: user.signInUserSession.accessToken.jwtToken,
        },
        {
          headers: {
            Authorization: session.getIdToken().jwtToken,
          },
        }
      );
    });
  };

  return (
    <>
      <form onSubmit={handleUpdate}>
        <label>
          New Email:
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <input type="submit" value="Update" />
      </form>

      <hr />

      <form onSubmit={handleVerify}>
        <label>
          Code:
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <input type="submit" value="Verify" />
      </form>
    </>
  );
};

function App() {
  return (
    <div>
      <UpdateEmail />
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
