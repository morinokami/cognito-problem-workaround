const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  const data = JSON.parse(event.body);
  const payload = JSON.parse(
    Buffer.from(
      event.headers["Authorization"].split(".")[1],
      "base64"
    ).toString("ascii")
  );
  const username = payload["cognito:username"];
  const userPoolId = process.env["USER_POOL_ID"];

  const user = await cognitoIdServiceProvider
    .adminGetUser({
      UserPoolId: userPoolId,
      Username: username,
    })
    .promise();
  const validatedEmail = user.UserAttributes.filter(
    (attr) => attr.Name === "email"
  )[0].Value;
  console.log(cognitoIdServiceProvider.updateUserAttributes);
  // await cognitoIdServiceProvider.updateUserAttributes(user, {
  //     email: data.email,
  //     'custom:temp_email': validatedEmail,
  // });

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
    },
    body: "hoge",
  };
  return response;
};
