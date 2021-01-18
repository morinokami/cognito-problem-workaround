const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event, _, callback) => {
  if (event.triggerSource === "CustomMessage_UpdateUserAttribute") {
    // Lambda を経由していない不正な更新操作かどうかを確認し、その場合は email の値をもとに戻す
    const lambda = event.request.userAttributes["custom:lambda"];
    if (lambda === "0") {
      const confirmedEmail =
        event.request.userAttributes["custom:confirmed_email"];
      const params = {
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "email",
            Value: confirmedEmail,
          },
        ],
        UserPoolId: event.userPoolId,
        Username: event.userName,
      };
      await cognitoIdServiceProvider
        .adminUpdateUserAttributes(params)
        .promise();
      throw new Error("不正な操作が実行されました");
    }

    const email = event.request.userAttributes.email;
    const tempEmail = event.request.userAttributes["custom:temp_email"];
    const params = {
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
        {
          Name: "email",
          Value: tempEmail,
        },
        {
          Name: "custom:temp_email",
          Value: email,
        },
        {
          Name: "custom:lambda",
          Value: "0",
        },
      ],
      UserPoolId: event.userPoolId,
      Username: event.userName,
    };
    await cognitoIdServiceProvider.adminUpdateUserAttributes(params).promise();
  }

  callback(null, event);
};
