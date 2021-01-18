const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event, _, callback) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    const email = event.request.userAttributes.email;
    const params = {
      UserAttributes: [
        {
          Name: "custom:confirmed_email",
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
