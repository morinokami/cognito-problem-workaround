import React from "react";
import { withAuthenticator, AmplifySignOut, form } from "@aws-amplify/ui-react";
import { Auth } from "aws-amplify";

const UpdateEmail = () => {
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleUpdate = async (event) => {
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser().catch(() => null);
    await Auth.updateUserAttributes(user, {
      email,
      "custom:temp_email": user.attributes.email,
    });
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser().catch(() => null);
    const newEmail = user.attributes["custom:temp_email"];
    const result = await Auth.verifyCurrentUserAttributeSubmit("email", code);
    if (result === "SUCCESS") {
      await Auth.updateUserAttributes(user, {
        newEmail,
        "custom:temp_email": newEmail,
      });
    }
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
