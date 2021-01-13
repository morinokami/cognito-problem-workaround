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

      try {
        await axios.post(
          "<メールアドレス更新用エンドポイント>",
          {
            email,
          },
          {
            headers: {
              Authorization: session.getIdToken().jwtToken,
            },
          }
        );
        alert("確認コードを送信しました");
      } catch (err) {
        console.error(err);
      }
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
        "<コード認証用エンドポイント>",
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
      <hr />
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
