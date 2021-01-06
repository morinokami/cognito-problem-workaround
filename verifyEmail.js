const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event, _, callback) => {
  if (event.triggerSource === "CustomMessage_UpdateUserAttribute") {
    const validatedEmail =
      event.request.userAttributes["custom:validated_email"];
    const params = {
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
        {
          Name: "email",
          Value: validatedEmail,
        },
      ],
      UserPoolId: event.userPoolId,
      Username: event.userName,
    };
    await cognitoIdServiceProvider.adminUpdateUserAttributes(params).promise();
    if (validatedEmail === event.request.userAttributes.email) {
      throw new Error("確認メール再送信を防ぐための意図的なエラー");
    }
  }
  callback(null, event);
};
