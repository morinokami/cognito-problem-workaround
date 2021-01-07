const aws = require("aws-sdk");
const cognitoIdServiceProvider = new aws.CognitoIdentityServiceProvider();

exports.handler = async (event, _, callback) => {
  if (event.triggerSource === "CustomMessage_UpdateUserAttribute") {
    const user = await cognitoIdServiceProvider
      .adminGetUser({
        UserPoolId: event.userPoolId,
        Username: event.userName,
      })
      .promise();
    const confirmationCode =
      event.request.userAttributes["custom:confirmation_code"];

    if (confirmationCode) {
      // コードを確認し、新しいメールアドレスへと置き換える処理
      await cognitoIdServiceProvider
        .verifyUserAttribute({
          AccessToken: event.accessToken,
          AttributeName: "email",
          Code: confirmationCode,
        })
        .catch((error) => {
          throw error;
        });

      const newEmail = user.UserAttributes.filter(
        (attr) => attr.Name === "custom:temp_email"
      )[0].Value;
      const params = {
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "email",
            Value: newEmail, // 保存されていた新しいメールアドレスへと書き換える
          },
          {
            Name: "custom:temp_email",
            Value: "",
          },
          {
            Name: "custom:confirmation_code",
            Value: "",
          },
        ],
        UserPoolId: event.userPoolId,
        Username: event.userName,
      };
      await cognitoIdServiceProvider
        .adminUpdateUserAttributes(params)
        .promise();
      throw new Error("確認メール再送信を防ぐための意図的なエラー");
    } else {
      // メールアドレスの変更を試みた場合の処理
      const validatedEmail = user.UserAttributes.filter(
        (attr) => attr.Name === "custom:temp_email"
      )[0].Value;
      const tempEmail = user.UserAttributes.filter(
        (attr) => attr.Name === "email"
      )[0].Value;
      const params = {
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "email",
            Value: validatedEmail, // 現在のメールアドレスへと戻す
          },
          {
            Name: "custom:temp_email",
            Value: tempEmail, // 新しいメールアドレスを一時保存
          },
        ],
        UserPoolId: event.userPoolId,
        Username: event.userName,
      };
      await cognitoIdServiceProvider
        .adminUpdateUserAttributes(params)
        .promise();
    }
  }

  callback(null, event);
};
